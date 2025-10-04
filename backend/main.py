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
from physics import calculate_impact

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

# CORS middleware - allow all origins for hackathon
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
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
    lon: float = Field(..., ge=-180, le=180, description="Impact longitude")
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
                        "semi_major_axis_au": float(od.get("semi_major_axis")) if od.get("semi_major_axis") else None,
                        "eccentricity": float(od.get("eccentricity")) if od.get("eccentricity") else None,
                        "inclination_deg": float(od.get("inclination")) if od.get("inclination") else None,
                        "orbital_period_days": float(od.get("orbital_period")) if od.get("orbital_period") else None,
                        "perihelion_distance_au": float(od.get("perihelion_distance")) if od.get("perihelion_distance") else None,
                        "aphelion_distance_au": float(od.get("aphelion_distance")) if od.get("aphelion_distance") else None,
                        "orbit_class_type": od.get("orbit_class", {}).get("orbit_class_type") if "orbit_class" in od else None
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
                "semi_major_axis_au": float(od.get("semi_major_axis")) if od.get("semi_major_axis") else None,
                "eccentricity": float(od.get("eccentricity")) if od.get("eccentricity") else None,
                "inclination_deg": float(od.get("inclination")) if od.get("inclination") else None,
                "orbital_period_days": float(od.get("orbital_period")) if od.get("orbital_period") else None,
                "perihelion_distance_au": float(od.get("perihelion_distance")) if od.get("perihelion_distance") else None,
                "aphelion_distance_au": float(od.get("aphelion_distance")) if od.get("aphelion_distance") else None,
                "orbit_class_type": od.get("orbit_class", {}).get("orbit_class_type") if "orbit_class" in od else None
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
                    "semi_major_axis_au": float(od.get("semi_major_axis")) if od.get("semi_major_axis") else None,
                    "eccentricity": float(od.get("eccentricity")) if od.get("eccentricity") else None,
                    "inclination_deg": float(od.get("inclination")) if od.get("inclination") else None,
                    "orbital_period_days": float(od.get("orbital_period")) if od.get("orbital_period") else None,
                    "perihelion_distance_au": float(od.get("perihelion_distance")) if od.get("perihelion_distance") else None,
                    "aphelion_distance_au": float(od.get("aphelion_distance")) if od.get("aphelion_distance") else None,
                    "orbit_class_type": od.get("orbit_class", {}).get("orbit_class_type") if "orbit_class" in od else None
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
    Calculate asteroid impact effects using physics formulas.
    Returns energy, crater size, damage zones, and death estimates.
    """
    try:
        result = calculate_impact(
            size_m=impact.size_m,
            speed_km_s=impact.speed_km_s,
            angle=impact.angle,
            lat=impact.lat,
            lon=impact.lon
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Impact calculation failed: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
