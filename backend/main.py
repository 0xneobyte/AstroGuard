from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional
import requests
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
import math
import json
from physics import calculate_impact, calculate_deflection, validate_against_chelyabinsk, validate_against_tunguska

# Load environment variables
load_dotenv()

# Custom JSON response with pretty printing
class PrettyJSONResponse(JSONResponse):
    def render(self, content) -> bytes:
        return json.dumps(
            content,
            ensure_ascii=False,
            allow_nan=False,
            indent=2,
            separators=(", ", ": "),
        ).encode("utf-8")

app = FastAPI(
    title="Asteroid Defense Command API",
    description="Backend API for asteroid impact simulation",
    version="1.0.0",
    default_response_class=PrettyJSONResponse
)

# CORS middleware - Configure for production
allowed_origins = [
    "http://localhost:3000",  # Local development
    "http://localhost:5173",  # Vite dev server
    "http://localhost:4173",  # Vite preview
    "http://localhost:4174",
    "https://astro-nuts-nasa-space-apps.vercel.app",  # Your Vercel domain
    "https://*.vercel.app",  # All Vercel preview deployments
]

# In development, allow all origins
if os.getenv("ENVIRONMENT") == "development":
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Environment variables
NASA_API_KEY = os.getenv("NASA_API_KEY")
NASA_BASE_URL = os.getenv("NASA_BASE_URL")


# Pydantic models
class CloseApproachData(BaseModel):
    close_approach_date: str
    relative_velocity_km_s: float
    miss_distance_km: float
    orbiting_body: str
    kinetic_energy_joules: float
    kinetic_energy_megatons_tnt: float


class OrbitalData(BaseModel):
    semi_major_axis_au: Optional[float] = None
    eccentricity: Optional[float] = None
    inclination_deg: Optional[float] = None
    orbital_period_days: Optional[float] = None
    perihelion_distance_au: Optional[float] = None
    aphelion_distance_au: Optional[float] = None
    orbit_class_type: Optional[str] = None
    # Additional fields for Spacekit visualization
    ascending_node_longitude_deg: Optional[float] = None
    perihelion_argument_deg: Optional[float] = None
    mean_anomaly_deg: Optional[float] = None
    epoch_osculation: Optional[float] = None


class AsteroidThreat(BaseModel):
    id: str
    name: str
    absolute_magnitude_h: Optional[float] = None
    estimated_diameter_min_m: float
    estimated_diameter_max_m: float
    is_potentially_hazardous: bool
    average_diameter_m: float
    estimated_mass_kg: float
    close_approach_data: List[CloseApproachData]
    orbital_data: Optional[OrbitalData] = None


class ThreatsResponse(BaseModel):
    count: int
    asteroids: List[AsteroidThreat]


class ImpactRequest(BaseModel):
    size_m: int = Field(..., ge=10, le=10000, description="Asteroid diameter in meters")
    speed_km_s: float = Field(..., ge=10, le=70, description="Velocity in km/s")
    lat: float = Field(..., ge=-90, le=90, description="Impact latitude")
    lon: float = Field(..., ge=-360, le=360, description="Impact longitude (auto-normalized to -180,180)")
    angle: int = Field(45, ge=15, le=90, description="Entry angle in degrees")
    absolute_magnitude_h: Optional[float] = Field(None, description="NASA H-magnitude for density calculation")


class SimulateRealImpactRequest(BaseModel):
    asteroid_id: str = Field(..., description="NASA asteroid ID")
    lat: float = Field(..., ge=-90, le=90, description="Impact latitude")
    lon: float = Field(..., ge=-360, le=360, description="Impact longitude (auto-normalized to -180,180)")
    angle: int = Field(45, ge=15, le=90, description="Entry angle in degrees")


class DamageZone(BaseModel):
    radius_km: float
    type: str
    color: str


class ImpactResponse(BaseModel):
    energy_megatons: float
    crater_diameter_km: float
    crater_depth_km: float
    damage_zones: List[DamageZone]
    deaths_estimated: int
    comparison: str


# Health check endpoint
@app.get("/")
async def health_check():
    return {"status": "online", "service": "Asteroid Defense Command API"}


# Get current asteroid threats from NASA
@app.get("/api/threats/current", response_model=ThreatsResponse)
async def get_current_threats():
    """
    Fetch real asteroid data from NASA NEO API.
    Returns top 10 closest asteroids approaching Earth in the next 7 days.
    """
    if not NASA_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="NASA API key not configured"
        )

    # Calculate date range: today to +7 days
    today = datetime.now().date()
    end_date = today + timedelta(days=7)

    # NASA NEO Feed API endpoint
    url = f"{NASA_BASE_URL}/feed"
    params = {
        "start_date": today.isoformat(),
        "end_date": end_date.isoformat(),
        "api_key": NASA_API_KEY
    }

    try:
        response = requests.get(url, params=params, timeout=10)

        # Handle rate limiting
        if response.status_code == 429:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="NASA API rate limit exceeded"
            )

        response.raise_for_status()
        data = response.json()

    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="NASA API timeout"
        )
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch NASA data: {str(e)}"
        )

    # Parse asteroid data
    asteroids = []
    near_earth_objects = data.get("near_earth_objects", {})

    for date, asteroids_on_date in near_earth_objects.items():
        for asteroid in asteroids_on_date:
            # Extract required data
            try:
                # Get diameter data
                diameter_min = asteroid["estimated_diameter"]["meters"]["estimated_diameter_min"]
                diameter_max = asteroid["estimated_diameter"]["meters"]["estimated_diameter_max"]
                avg_diameter = (diameter_min + diameter_max) / 2

                # Calculate mass (assume rocky asteroid density: 3000 kg/m³)
                radius_m = avg_diameter / 2
                volume_m3 = (4/3) * math.pi * (radius_m ** 3)
                mass_kg = volume_m3 * 3000

                # Process all close approach data with kinetic energy
                close_approaches = []
                for approach in asteroid.get("close_approach_data", []):
                    velocity_km_s = float(approach["relative_velocity"]["kilometers_per_second"])
                    velocity_m_s = velocity_km_s * 1000

                    # Calculate kinetic energy: E = 0.5 * m * v²
                    kinetic_energy_joules = 0.5 * mass_kg * (velocity_m_s ** 2)
                    kinetic_energy_megatons = kinetic_energy_joules / 4.184e15

                    close_approaches.append({
                        "close_approach_date": approach["close_approach_date"],
                        "relative_velocity_km_s": velocity_km_s,
                        "miss_distance_km": float(approach["miss_distance"]["kilometers"]),
                        "orbiting_body": approach.get("orbiting_body", "Earth"),
                        "kinetic_energy_joules": kinetic_energy_joules,
                        "kinetic_energy_megatons_tnt": kinetic_energy_megatons
                    })

                # Get orbital data if available (only in browse endpoint, not feed)
                orbital_data = None
                od = asteroid.get("orbital_data")
                if od and isinstance(od, dict) and od:  # Check it's not empty
                    orbital_data = {
                        "semi_major_axis_au": float(od["semi_major_axis"]) if "semi_major_axis" in od and od["semi_major_axis"] is not None else None,
                        "eccentricity": float(od["eccentricity"]) if "eccentricity" in od and od["eccentricity"] is not None else None,
                        "inclination_deg": float(od["inclination"]) if "inclination" in od and od["inclination"] is not None else None,
                        "orbital_period_days": float(od["orbital_period"]) if "orbital_period" in od and od["orbital_period"] is not None else None,
                        "perihelion_distance_au": float(od["perihelion_distance"]) if "perihelion_distance" in od and od["perihelion_distance"] is not None else None,
                        "aphelion_distance_au": float(od["aphelion_distance"]) if "aphelion_distance" in od and od["aphelion_distance"] is not None else None,
                        "orbit_class_type": od.get("orbit_class", {}).get("orbit_class_type"),
                        "ascending_node_longitude_deg": float(od["ascending_node_longitude"]) if "ascending_node_longitude" in od and od["ascending_node_longitude"] is not None else None,
                        "perihelion_argument_deg": float(od["perihelion_argument"]) if "perihelion_argument" in od and od["perihelion_argument"] is not None else None,
                        "mean_anomaly_deg": float(od["mean_anomaly"]) if "mean_anomaly" in od and od["mean_anomaly"] is not None else None,
                        "epoch_osculation": float(od["epoch_osculation"]) if "epoch_osculation" in od and od["epoch_osculation"] is not None else None
                    }

                asteroid_data = {
                    "id": asteroid["id"],
                    "name": asteroid["name"],
                    "absolute_magnitude_h": asteroid.get("absolute_magnitude_h"),
                    "estimated_diameter_min_m": diameter_min,
                    "estimated_diameter_max_m": diameter_max,
                    "is_potentially_hazardous": asteroid["is_potentially_hazardous_asteroid"],
                    "average_diameter_m": avg_diameter,
                    "estimated_mass_kg": mass_kg,
                    "close_approach_data": close_approaches,
                    "orbital_data": orbital_data
                }
                asteroids.append(asteroid_data)
            except (KeyError, IndexError, ValueError) as e:
                # Skip asteroids with missing data
                continue

    # Sort by closest approach distance (first approach for each asteroid)
    asteroids.sort(key=lambda x: x["close_approach_data"][0]["miss_distance_km"] if x["close_approach_data"] else float('inf'))

    return ThreatsResponse(
        count=len(asteroids),
        asteroids=asteroids
    )


# Get detailed asteroid data with all close approaches
@app.get("/api/asteroid/{asteroid_id}")
async def get_asteroid_details(asteroid_id: str):
    """
    Fetch detailed asteroid data including all historical and future close approaches.
    """
    if not NASA_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="NASA API key not configured"
        )

    # NASA NEO Lookup API endpoint
    url = f"{NASA_BASE_URL}/neo/{asteroid_id}"
    params = {"api_key": NASA_API_KEY}

    try:
        response = requests.get(url, params=params, timeout=10)

        if response.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Asteroid {asteroid_id} not found"
            )

        if response.status_code == 429:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="NASA API rate limit exceeded"
            )

        response.raise_for_status()
        asteroid = response.json()

    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="NASA API timeout"
        )
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch NASA data: {str(e)}"
        )

    # Process asteroid data
    try:
        # Get diameter data
        diameter_min = asteroid["estimated_diameter"]["meters"]["estimated_diameter_min"]
        diameter_max = asteroid["estimated_diameter"]["meters"]["estimated_diameter_max"]
        avg_diameter = (diameter_min + diameter_max) / 2

        # Calculate mass
        radius_m = avg_diameter / 2
        volume_m3 = (4/3) * math.pi * (radius_m ** 3)
        mass_kg = volume_m3 * 3000

        # Process ALL close approach data
        close_approaches = []
        for approach in asteroid.get("close_approach_data", []):
            velocity_km_s = float(approach["relative_velocity"]["kilometers_per_second"])
            velocity_m_s = velocity_km_s * 1000

            # Calculate kinetic energy
            kinetic_energy_joules = 0.5 * mass_kg * (velocity_m_s ** 2)
            kinetic_energy_megatons = kinetic_energy_joules / 4.184e15

            close_approaches.append({
                "close_approach_date": approach["close_approach_date"],
                "relative_velocity_km_s": velocity_km_s,
                "miss_distance_km": float(approach["miss_distance"]["kilometers"]),
                "orbiting_body": approach.get("orbiting_body", "Earth"),
                "kinetic_energy_joules": kinetic_energy_joules,
                "kinetic_energy_megatons_tnt": kinetic_energy_megatons
            })

        # Get orbital data
        orbital_data = None
        od = asteroid.get("orbital_data")
        if od and isinstance(od, dict) and od:
            orbital_data = {
                "semi_major_axis_au": float(od["semi_major_axis"]) if "semi_major_axis" in od and od["semi_major_axis"] is not None else None,
                "eccentricity": float(od["eccentricity"]) if "eccentricity" in od and od["eccentricity"] is not None else None,
                "inclination_deg": float(od["inclination"]) if "inclination" in od and od["inclination"] is not None else None,
                "orbital_period_days": float(od["orbital_period"]) if "orbital_period" in od and od["orbital_period"] is not None else None,
                "perihelion_distance_au": float(od["perihelion_distance"]) if "perihelion_distance" in od and od["perihelion_distance"] is not None else None,
                "aphelion_distance_au": float(od["aphelion_distance"]) if "aphelion_distance" in od and od["aphelion_distance"] is not None else None,
                "orbit_class_type": od.get("orbit_class", {}).get("orbit_class_type"),
                "ascending_node_longitude_deg": float(od["ascending_node_longitude"]) if "ascending_node_longitude" in od and od["ascending_node_longitude"] is not None else None,
                "perihelion_argument_deg": float(od["perihelion_argument"]) if "perihelion_argument" in od and od["perihelion_argument"] is not None else None,
                "mean_anomaly_deg": float(od["mean_anomaly"]) if "mean_anomaly" in od and od["mean_anomaly"] is not None else None,
                "epoch_osculation": float(od["epoch_osculation"]) if "epoch_osculation" in od and od["epoch_osculation"] is not None else None
            }

        result = {
            "id": asteroid["id"],
            "name": asteroid["name"],
            "absolute_magnitude_h": asteroid.get("absolute_magnitude_h"),
            "estimated_diameter_min_m": diameter_min,
            "estimated_diameter_max_m": diameter_max,
            "is_potentially_hazardous": asteroid["is_potentially_hazardous_asteroid"],
            "average_diameter_m": avg_diameter,
            "estimated_mass_kg": mass_kg,
            "close_approach_data": close_approaches,
            "orbital_data": orbital_data
        }

        return result

    except (KeyError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process asteroid data: {str(e)}"
        )


# Browse asteroids with full historical data
@app.get("/api/asteroids/browse")
async def browse_asteroids(page: int = 0, size: int = 20):
    """
    Browse asteroid database with historical close approach data.
    Returns famous asteroids like Eros with complete approach history.
    """
    if not NASA_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="NASA API key not configured"
        )

    # NASA NEO Browse API endpoint
    url = f"{NASA_BASE_URL}/neo/browse"
    params = {
        "api_key": NASA_API_KEY,
        "page": page,
        "size": min(size, 20)  # NASA limits to 20
    }

    try:
        response = requests.get(url, params=params, timeout=15)

        if response.status_code == 429:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="NASA API rate limit exceeded"
            )

        response.raise_for_status()
        data = response.json()

    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="NASA API timeout"
        )
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch NASA data: {str(e)}"
        )

    # Process asteroids
    asteroids = []
    for asteroid in data.get("near_earth_objects", []):
        try:
            # Get diameter data
            diameter_min = asteroid["estimated_diameter"]["meters"]["estimated_diameter_min"]
            diameter_max = asteroid["estimated_diameter"]["meters"]["estimated_diameter_max"]
            avg_diameter = (diameter_min + diameter_max) / 2

            # Calculate mass
            radius_m = avg_diameter / 2
            volume_m3 = (4/3) * math.pi * (radius_m ** 3)
            mass_kg = volume_m3 * 3000

            # Process ALL close approach data with kinetic energy
            close_approaches = []
            for approach in asteroid.get("close_approach_data", []):
                velocity_km_s = float(approach["relative_velocity"]["kilometers_per_second"])
                velocity_m_s = velocity_km_s * 1000

                # Calculate kinetic energy
                kinetic_energy_joules = 0.5 * mass_kg * (velocity_m_s ** 2)
                kinetic_energy_megatons = kinetic_energy_joules / 4.184e15

                close_approaches.append({
                    "close_approach_date": approach["close_approach_date"],
                    "relative_velocity_km_s": velocity_km_s,
                    "miss_distance_km": float(approach["miss_distance"]["kilometers"]),
                    "orbiting_body": approach.get("orbiting_body", "Earth"),
                    "kinetic_energy_joules": kinetic_energy_joules,
                    "kinetic_energy_megatons_tnt": kinetic_energy_megatons
                })

            # Get orbital data
            orbital_data = None
            od = asteroid.get("orbital_data")
            if od and isinstance(od, dict) and od:
                orbital_data = {
                    "semi_major_axis_au": float(od["semi_major_axis"]) if "semi_major_axis" in od and od["semi_major_axis"] is not None else None,
                    "eccentricity": float(od["eccentricity"]) if "eccentricity" in od and od["eccentricity"] is not None else None,
                    "inclination_deg": float(od["inclination"]) if "inclination" in od and od["inclination"] is not None else None,
                    "orbital_period_days": float(od["orbital_period"]) if "orbital_period" in od and od["orbital_period"] is not None else None,
                    "perihelion_distance_au": float(od["perihelion_distance"]) if "perihelion_distance" in od and od["perihelion_distance"] is not None else None,
                    "aphelion_distance_au": float(od["aphelion_distance"]) if "aphelion_distance" in od and od["aphelion_distance"] is not None else None,
                    "orbit_class_type": od.get("orbit_class", {}).get("orbit_class_type"),
                    "ascending_node_longitude_deg": float(od["ascending_node_longitude"]) if "ascending_node_longitude" in od and od["ascending_node_longitude"] is not None else None,
                    "perihelion_argument_deg": float(od["perihelion_argument"]) if "perihelion_argument" in od and od["perihelion_argument"] is not None else None,
                    "mean_anomaly_deg": float(od["mean_anomaly"]) if "mean_anomaly" in od and od["mean_anomaly"] is not None else None,
                    "epoch_osculation": float(od["epoch_osculation"]) if "epoch_osculation" in od and od["epoch_osculation"] is not None else None
                }

            asteroids.append({
                "id": asteroid["id"],
                "name": asteroid["name"],
                "absolute_magnitude_h": asteroid.get("absolute_magnitude_h"),
                "estimated_diameter_min_m": diameter_min,
                "estimated_diameter_max_m": diameter_max,
                "is_potentially_hazardous": asteroid["is_potentially_hazardous_asteroid"],
                "average_diameter_m": avg_diameter,
                "estimated_mass_kg": mass_kg,
                "close_approach_data": close_approaches,
                "orbital_data": orbital_data
            })

        except (KeyError, ValueError):
            continue

    return {
        "page": data.get("page", {}).get("number", page),
        "total_pages": data.get("page", {}).get("total_pages", 0),
        "count": len(asteroids),
        "asteroids": asteroids
    }


# Calculate impact physics
@app.post("/api/calculate-impact", response_model=ImpactResponse)
async def calculate_impact_endpoint(impact: ImpactRequest):
    """
    Calculate asteroid impact effects using scientific physics formulas.
    Now includes taxonomic density classification and atmospheric effects.
    """
    try:
        # Normalize longitude to -180,180 range if needed
        lon = impact.lon
        if lon > 180:
            lon = lon - 360
        elif lon < -180:
            lon = lon + 360
            
        result = calculate_impact(
            size_m=impact.size_m,
            speed_km_s=impact.speed_km_s,
            angle=impact.angle,
            lat=impact.lat,
            lon=lon,
            absolute_magnitude_h=impact.absolute_magnitude_h
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Impact calculation failed: {str(e)}"
        )


# Simulate real asteroid impact
@app.post("/api/simulate-real-impact")
async def simulate_real_impact(request: SimulateRealImpactRequest):
    """
    Simulate impact using a real NASA asteroid's parameters.
    Fetches asteroid data and calculates what would happen if it hit Earth.
    """
    if not NASA_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="NASA API key not configured"
        )

    # Fetch real asteroid data
    url = f"{NASA_BASE_URL}/neo/{request.asteroid_id}"
    params = {"api_key": NASA_API_KEY}

    try:
        response = requests.get(url, params=params, timeout=10)

        if response.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Asteroid {request.asteroid_id} not found"
            )

        if response.status_code == 429:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="NASA API rate limit exceeded"
            )

        response.raise_for_status()
        asteroid = response.json()

    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="NASA API timeout"
        )
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch NASA data: {str(e)}"
        )

    # Extract asteroid parameters
    try:
        diameter_min = asteroid["estimated_diameter"]["meters"]["estimated_diameter_min"]
        diameter_max = asteroid["estimated_diameter"]["meters"]["estimated_diameter_max"]
        avg_diameter = (diameter_min + diameter_max) / 2

        # Get velocity from first close approach
        if not asteroid.get("close_approach_data"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Asteroid has no close approach data"
            )

        velocity_km_s = float(asteroid["close_approach_data"][0]["relative_velocity"]["kilometers_per_second"])

        # Normalize longitude to -180,180 range if needed
        lon = request.lon
        if lon > 180:
            lon = lon - 360
        elif lon < -180:
            lon = lon + 360

        # Calculate impact using real asteroid parameters with H-magnitude
        impact_result = calculate_impact(
            size_m=int(avg_diameter),
            speed_km_s=velocity_km_s,
            angle=request.angle,
            lat=request.lat,
            lon=lon,
            absolute_magnitude_h=asteroid.get("absolute_magnitude_h")
        )

        # Get actual miss distance for context
        actual_miss_km = float(asteroid["close_approach_data"][0]["miss_distance"]["kilometers"])
        close_approach_date = asteroid["close_approach_data"][0]["close_approach_date"]

        return {
            "asteroid": {
                "id": asteroid["id"],
                "name": asteroid["name"],
                "actual_miss_distance_km": actual_miss_km,
                "size_m": avg_diameter,
                "speed_km_s": velocity_km_s
            },
            "simulated_impact": impact_result,
            "warning": "⚠️ This is a simulation. This asteroid will NOT hit Earth.",
            "actual_close_approach": close_approach_date
        }

    except (KeyError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process asteroid data: {str(e)}"
        )


@app.get("/api/deflection/calculate")
async def calculate_deflection_endpoint(
    size_m: float,
    mass_kg: float,
    velocity_km_s: float,
    time_to_impact_days: float,
    method: str,
    spacecraft_mass_kg: float = 1000,
    spacecraft_velocity_km_s: float = 10.0
):
    """
    Calculate asteroid deflection using various mitigation strategies.
    
    Args:
        size_m: Asteroid diameter in meters
        mass_kg: Asteroid mass in kg
        velocity_km_s: Current velocity in km/s
        time_to_impact_days: Days until impact
        method: "kinetic_impactor", "gravity_tractor", or "nuclear"
        spacecraft_mass_kg: Spacecraft mass (for kinetic/nuclear methods)
        spacecraft_velocity_km_s: Spacecraft velocity (for kinetic impactor)
    """
    
    result = calculate_deflection(
        asteroid_size_m=size_m,
        asteroid_mass_kg=mass_kg,
        asteroid_velocity_km_s=velocity_km_s,
        time_to_impact_days=time_to_impact_days,
        deflection_method=method,
        spacecraft_mass_kg=spacecraft_mass_kg,
        spacecraft_velocity_km_s=spacecraft_velocity_km_s
    )
    
    return result


# AI Chat Models
class AIChatRequest(BaseModel):
    message: str
    context: dict
    history: List[dict] = []


class AISummaryRequest(BaseModel):
    context: dict


@app.post("/api/ai/chat")
async def ai_chat(request: AIChatRequest):
    """
    AI-powered chat about asteroid data and impacts.
    """
    try:
        import openai
        
        # Get OpenAI API key from environment
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="OpenAI API key not configured"
            )
        
        # Create OpenAI client
        client = openai.OpenAI(api_key=openai_api_key)
        
        # Build system prompt with context
        system_prompt = """You are an expert AI assistant for ASTROGUARD, an asteroid impact simulation and defense system. 
You help users understand asteroid threats, impact physics, and planetary defense strategies.

Be concise, informative, and accurate. Use scientific terms but explain them clearly.
When discussing impacts, be realistic about the dangers but also educational.
If asked about deflection strategies, explain the physics and practicality."""

        # Add context to system prompt
        if request.context.get("asteroid"):
            ast = request.context["asteroid"]
            system_prompt += f"\n\nCurrent Asteroid: {ast.get('name', 'Unknown')}"
            system_prompt += f"\n- Diameter: {ast.get('diameter_min', 0):.1f} - {ast.get('diameter_max', 0):.1f} meters"
            system_prompt += f"\n- Velocity: {ast.get('velocity', 0):.2f} km/s"
            system_prompt += f"\n- Potentially Hazardous: {'Yes' if ast.get('is_hazardous') else 'No'}"
            if ast.get('close_approach_date'):
                system_prompt += f"\n- Close Approach: {ast.get('close_approach_date')}"
        
        if request.context.get("impact"):
            imp = request.context["impact"]
            system_prompt += f"\n\nSimulated Impact Results:"
            system_prompt += f"\n- Energy: {imp.get('energy_megatons', 0):.2f} megatons TNT"
            system_prompt += f"\n- Crater: {imp.get('crater_diameter_km', 0):.2f} km diameter"
            system_prompt += f"\n- Fireball: {imp.get('fireball_radius_km', 0):.2f} km radius"
            system_prompt += f"\n- Blast radius: {imp.get('blast_radius_km', 0):.2f} km"
            system_prompt += f"\n- Severity: {imp.get('severity', 'Unknown')}"
        
        # Build messages array
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history (last 6 messages)
        for msg in request.history[-6:]:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
        
        # Add current message
        messages.append({"role": "user", "content": request.message})
        
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Using GPT-4o-mini for cost efficiency
            messages=messages,
            max_tokens=500,
            temperature=0.7,
        )
        
        return {
            "response": response.choices[0].message.content
        }
        
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI library not installed. Run: pip install openai"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI chat error: {str(e)}"
        )


@app.post("/api/ai/summary")
async def ai_summary(request: AISummaryRequest):
    """
    Generate an AI summary of asteroid data and impact.
    """
    try:
        import openai
        
        # Get OpenAI API key from environment
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="OpenAI API key not configured"
            )
        
        # Create OpenAI client
        client = openai.OpenAI(api_key=openai_api_key)
        
        # Build detailed prompt for summary
        prompt = "Generate a comprehensive but concise summary of this asteroid threat scenario:\n\n"
        
        if request.context.get("asteroid"):
            ast = request.context["asteroid"]
            prompt += f"Asteroid: {ast.get('name', 'Unknown')}\n"
            prompt += f"Size: {ast.get('diameter_min', 0):.1f} - {ast.get('diameter_max', 0):.1f} meters diameter\n"
            prompt += f"Velocity: {ast.get('velocity', 0):.2f} km/s\n"
            prompt += f"Hazardous Classification: {'Potentially Hazardous' if ast.get('is_hazardous') else 'Non-Hazardous'}\n"
            if ast.get('close_approach_date'):
                prompt += f"Close Approach Date: {ast.get('close_approach_date')}\n"
            if ast.get('miss_distance'):
                prompt += f"Miss Distance: {float(ast.get('miss_distance', 0)):,.0f} km\n"
        
        if request.context.get("impact"):
            imp = request.context["impact"]
            prompt += f"\nImpact Simulation:\n"
            prompt += f"Impact Energy: {imp.get('energy_megatons', 0):.2f} megatons TNT equivalent\n"
            prompt += f"Crater Diameter: {imp.get('crater_diameter_km', 0):.2f} km\n"
            prompt += f"Fireball Radius: {imp.get('fireball_radius_km', 0):.2f} km\n"
            prompt += f"Blast Radius (overpressure): {imp.get('blast_radius_km', 0):.2f} km\n"
            prompt += f"Thermal Radiation: {imp.get('thermal_radius_km', 0):.2f} km radius\n"
            prompt += f"Seismic Effect: {imp.get('seismic_magnitude', 0):.1f} magnitude\n"
            prompt += f"Severity: {imp.get('severity', 'Unknown')}\n"
        
        if request.context.get("location"):
            loc = request.context["location"]
            prompt += f"\nImpact Location: {loc.get('latitude', 0):.4f}°, {loc.get('longitude', 0):.4f}°\n"
        
        prompt += "\nProvide:\n1. A brief threat assessment\n2. Key impact characteristics\n3. Potential consequences\n4. Recommended mitigation approach if applicable\n\nBe scientific but accessible. Keep it under 200 words."
        
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert asteroid impact analyst for ASTROGUARD. Provide clear, concise, scientific analysis."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=400,
            temperature=0.7,
        )
        
        return {
            "summary": response.choices[0].message.content
        }
        
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI library not installed. Run: pip install openai"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI summary error: {str(e)}"
        )


@app.get("/api/validate-science")
async def validate_science():
    """
    Validate our scientific improvements against known impact events.
    Returns accuracy comparison for Chelyabinsk and Tunguska events.
    """
    try:
        chelyabinsk = validate_against_chelyabinsk()
        tunguska = validate_against_tunguska()
        
        return {
            "validation_results": {
                "chelyabinsk": chelyabinsk,
                "tunguska": tunguska
            },
            "improvements_summary": {
                "asteroid_density": "Now uses taxonomic classification instead of fixed 3000 kg/m³",
                "atmospheric_effects": "Includes velocity deceleration during entry",
                "casualty_model": "Uses evidence-based nuclear test mortality rates",
                "population_density": "Improved urban/rural estimates (WorldPop API ready)",
                "validation_status": "Tested against historical impact events"
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Validation failed: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
