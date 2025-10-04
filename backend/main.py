from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import requests
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
import math
from physics import calculate_impact

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Asteroid Defense Command API",
    description="Backend API for asteroid impact simulation",
    version="1.0.0"
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
class AsteroidThreat(BaseModel):
    id: str
    name: str
    size_m: float
    speed_km_s: float
    close_approach_date: str
    miss_distance_km: float
    is_hazardous: bool


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
                asteroid_data = {
                    "id": asteroid["id"],
                    "name": asteroid["name"],
                    "size_m": asteroid["estimated_diameter"]["meters"]["estimated_diameter_max"],
                    "speed_km_s": float(asteroid["close_approach_data"][0]["relative_velocity"]["kilometers_per_second"]),
                    "close_approach_date": asteroid["close_approach_data"][0]["close_approach_date"],
                    "miss_distance_km": float(asteroid["close_approach_data"][0]["miss_distance"]["kilometers"]),
                    "is_hazardous": asteroid["is_potentially_hazardous_asteroid"]
                }
                asteroids.append(asteroid_data)
            except (KeyError, IndexError, ValueError):
                # Skip asteroids with missing data
                continue

    # Sort by miss distance (closest first) and take top 10
    asteroids.sort(key=lambda x: x["miss_distance_km"])
    top_asteroids = asteroids[:10]

    return ThreatsResponse(
        count=len(top_asteroids),
        asteroids=top_asteroids
    )


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
