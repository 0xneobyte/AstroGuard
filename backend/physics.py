"""
Impact physics calculations for asteroid simulator.
All formulas based on real impact physics and scaling laws.
"""

import math


def calculate_impact(size_m: int, speed_km_s: float, angle: int, lat: float, lon: float) -> dict:
    """
    Calculate asteroid impact effects.

    Args:
        size_m: Asteroid diameter in meters
        speed_km_s: Velocity in km/s
        angle: Entry angle in degrees
        lat: Impact latitude
        lon: Impact longitude

    Returns:
        Dictionary with impact results
    """

    # 1. Mass calculation
    # Volume = (4/3) × π × r³
    radius_m = size_m / 2
    volume_m3 = (4/3) * math.pi * (radius_m ** 3)

    # Assume rocky asteroid density: 3000 kg/m³
    density_kg_m3 = 3000
    mass_kg = volume_m3 * density_kg_m3

    # 2. Kinetic energy calculation
    # E = 0.5 × m × v²
    velocity_m_s = speed_km_s * 1000  # Convert km/s to m/s
    energy_joules = 0.5 * mass_kg * (velocity_m_s ** 2)

    # Convert to megatons TNT (1 megaton = 4.184 × 10^15 joules)
    energy_megatons = energy_joules / 4.184e15

    # 3. Crater size calculation
    # D = 1.8 × (E^0.25) × (ρ^-0.33) × sin(θ)^0.33
    # where E is in joules, ρ is target density (assume 2500 kg/m³ for Earth's crust)
    target_density = 2500
    angle_rad = math.radians(angle)

    crater_diameter_m = (
        1.8 *
        (energy_joules ** 0.25) *
        (target_density ** -0.33) *
        (math.sin(angle_rad) ** 0.33)
    )
    crater_diameter_km = crater_diameter_m / 1000

    # Crater depth = diameter × 0.3
    crater_depth_km = crater_diameter_km * 0.3

    # 4. Damage zones calculation
    # Convert megatons to tons for formulas
    tnt_tons = energy_megatons * 1_000_000

    # Calculate damage radii in km
    # Total destruction (20 psi overpressure)
    total_destruction_km = 0.28 * (tnt_tons ** (1/3))

    # Severe damage (5 psi overpressure)
    severe_damage_km = 0.52 * (tnt_tons ** (1/3))

    # Moderate damage (1 psi overpressure)
    moderate_damage_km = 1.0 * (tnt_tons ** (1/3))

    # Thermal burns (3rd degree)
    thermal_burns_km = 0.15 * (tnt_tons ** 0.41)

    # Create damage zones array (sorted from largest to smallest for rendering)
    damage_zones = [
        {
            "radius_km": round(thermal_burns_km, 2),
            "type": "thermal_burns",
            "color": "pink"
        },
        {
            "radius_km": round(moderate_damage_km, 2),
            "type": "moderate_damage",
            "color": "yellow"
        },
        {
            "radius_km": round(severe_damage_km, 2),
            "type": "severe_damage",
            "color": "orange"
        },
        {
            "radius_km": round(total_destruction_km, 2),
            "type": "total_destruction",
            "color": "red"
        },
        {
            "radius_km": round(crater_diameter_km / 2, 2),
            "type": "crater",
            "color": "black"
        }
    ]

    # 5. Death estimate
    # Calculate area of total destruction zone
    area_km2 = math.pi * (total_destruction_km ** 2)

    # Assume population density (1000 people/km² for cities)
    # This is a rough estimate - actual density varies greatly
    population_density = 1000

    # Apply 70% casualty rate in total destruction zone
    deaths_estimated = int(area_km2 * population_density * 0.7)

    # 6. Comparison string
    comparison = generate_comparison(energy_megatons)

    return {
        "energy_megatons": round(energy_megatons, 3),
        "crater_diameter_km": round(crater_diameter_km, 2),
        "crater_depth_km": round(crater_depth_km, 2),
        "damage_zones": damage_zones,
        "deaths_estimated": deaths_estimated,
        "comparison": comparison
    }


def generate_comparison(megatons: float) -> str:
    """
    Generate human-readable comparison for impact energy.

    Args:
        megatons: Energy in megatons TNT

    Returns:
        Comparison string
    """
    hiroshima = 0.015  # Hiroshima bomb was ~15 kilotons = 0.015 megatons

    if megatons < hiroshima:
        # Less than Hiroshima
        kilotons = megatons * 1000
        return f"{kilotons:.1f} kilotons (smaller than Hiroshima)"

    elif megatons < 15:
        # Between Hiroshima and 15 megatons
        multiplier = megatons / hiroshima
        return f"{multiplier:.0f}x Hiroshima bomb"

    elif megatons < 1000:
        # Tunguska range (10-15 megatons)
        if 10 <= megatons <= 20:
            return f"Tunguska event scale ({megatons:.0f} megatons)"
        else:
            return f"{megatons:.0f} megatons (major catastrophe)"

    elif megatons < 100000:
        # Very large impact
        return f"{megatons:.0f} megatons (civilization-threatening)"

    else:
        # Extinction-level event
        return f"{megatons:.0f} megatons (dinosaur extinction level)"


def calculate_deflection(
    asteroid_size_m: float,
    asteroid_mass_kg: float,
    asteroid_velocity_km_s: float,
    time_to_impact_days: float,
    deflection_method: str,
    spacecraft_mass_kg: float = 1000,
    spacecraft_velocity_km_s: float = 10.0
) -> dict:
    """
    Calculate asteroid deflection using various mitigation strategies.
    
    Args:
        asteroid_size_m: Asteroid diameter in meters
        asteroid_mass_kg: Asteroid mass in kg
        asteroid_velocity_km_s: Current velocity in km/s
        time_to_impact_days: Days until impact
        deflection_method: "kinetic_impactor", "gravity_tractor", "nuclear"
        spacecraft_mass_kg: Spacecraft mass for kinetic/nuclear methods
        spacecraft_velocity_km_s: Spacecraft velocity for kinetic impactor
        
    Returns:
        Dictionary with deflection results
    """
    
    if deflection_method == "kinetic_impactor":
        return _kinetic_impactor_deflection(
            asteroid_mass_kg, asteroid_velocity_km_s, 
            time_to_impact_days, spacecraft_mass_kg, spacecraft_velocity_km_s
        )
    elif deflection_method == "gravity_tractor":
        return _gravity_tractor_deflection(
            asteroid_mass_kg, asteroid_size_m, time_to_impact_days
        )
    elif deflection_method == "nuclear":
        return _nuclear_deflection(
            asteroid_mass_kg, asteroid_velocity_km_s, 
            time_to_impact_days, spacecraft_mass_kg
        )
    else:
        return {"error": "Invalid deflection method"}


def _kinetic_impactor_deflection(
    asteroid_mass_kg: float,
    asteroid_velocity_km_s: float,
    time_to_impact_days: float,
    spacecraft_mass_kg: float,
    spacecraft_velocity_km_s: float
) -> dict:
    """
    Calculate deflection using kinetic impactor (DART-like mission).
    """
    
    # Convert velocities to m/s
    asteroid_velocity_m_s = asteroid_velocity_km_s * 1000
    spacecraft_velocity_m_s = spacecraft_velocity_km_s * 1000
    
    # Momentum transfer (assuming perfect inelastic collision)
    # Δv = (m_impactor × v_impactor) / (m_asteroid + m_impactor)
    momentum_transfer = (spacecraft_mass_kg * spacecraft_velocity_m_s) / (asteroid_mass_kg + spacecraft_mass_kg)
    velocity_change_m_s = momentum_transfer
    velocity_change_km_s = velocity_change_m_s / 1000
    
    # Calculate deflection distance
    # For simplicity, assume the velocity change is perpendicular to the asteroid's path
    # Time until impact in seconds
    time_to_impact_s = time_to_impact_days * 24 * 3600
    
    # Earth's radius (approximate)
    earth_radius_km = 6371
    
    # Simple deflection calculation
    # The asteroid will miss Earth by: Δv × time / (orbital velocity)
    # This is a simplified calculation
    deflection_distance_km = velocity_change_km_s * time_to_impact_days * 24
    
    # Effectiveness rating (0-100%)
    if deflection_distance_km > earth_radius_km * 2:
        effectiveness = 100
        status = "Complete deflection - Earth safe"
    elif deflection_distance_km > earth_radius_km:
        effectiveness = 80
        status = "Major deflection - reduced impact"
    elif deflection_distance_km > earth_radius_km * 0.5:
        effectiveness = 50
        status = "Partial deflection - impact reduced"
    else:
        effectiveness = 20
        status = "Minimal deflection - impact still likely"
    
    return {
        "method": "Kinetic Impactor",
        "velocity_change_km_s": round(velocity_change_km_s, 6),
        "deflection_distance_km": round(deflection_distance_km, 2),
        "effectiveness": effectiveness,
        "status": status,
        "time_required_days": 30,  # Mission preparation time
        "success_probability": min(95, max(20, effectiveness + 10)),
        "description": f"High-speed spacecraft collision changes asteroid velocity by {velocity_change_km_s:.4f} km/s"
    }


def _gravity_tractor_deflection(
    asteroid_mass_kg: float,
    asteroid_size_m: float,
    time_to_impact_days: float
) -> dict:
    """
    Calculate deflection using gravity tractor method.
    """
    
    # Gravity tractor parameters
    tractor_mass_kg = 10000  # 10 ton spacecraft
    tractor_distance_m = 100  # 100m from asteroid surface
    
    # Gravitational force calculation
    G = 6.674e-11  # Gravitational constant
    force_N = G * asteroid_mass_kg * tractor_mass_kg / (tractor_distance_m ** 2)
    
    # Acceleration imparted to asteroid
    acceleration_m_s2 = force_N / asteroid_mass_kg
    
    # Total velocity change over time
    time_to_impact_s = time_to_impact_days * 24 * 3600
    velocity_change_m_s = acceleration_m_s2 * time_to_impact_s
    velocity_change_km_s = velocity_change_m_s / 1000
    
    # Calculate deflection distance
    earth_radius_km = 6371
    deflection_distance_km = velocity_change_km_s * time_to_impact_days * 24
    
    # Effectiveness rating
    if deflection_distance_km > earth_radius_km * 1.5:
        effectiveness = 90
        status = "Excellent deflection - Earth safe"
    elif deflection_distance_km > earth_radius_km:
        effectiveness = 70
        status = "Good deflection - impact avoided"
    elif deflection_distance_km > earth_radius_km * 0.3:
        effectiveness = 40
        status = "Moderate deflection - impact reduced"
    else:
        effectiveness = 15
        status = "Minimal deflection - impact still likely"
    
    return {
        "method": "Gravity Tractor",
        "velocity_change_km_s": round(velocity_change_km_s, 6),
        "deflection_distance_km": round(deflection_distance_km, 2),
        "effectiveness": effectiveness,
        "status": status,
        "time_required_days": max(365, time_to_impact_days - 100),  # Long-term mission
        "success_probability": min(85, max(30, effectiveness + 5)),
        "description": f"Gravitational tug gradually changes asteroid velocity by {velocity_change_km_s:.4f} km/s"
    }


def _nuclear_deflection(
    asteroid_mass_kg: float,
    asteroid_velocity_km_s: float,
    time_to_impact_days: float,
    spacecraft_mass_kg: float
) -> dict:
    """
    Calculate deflection using nuclear detonation.
    """
    
    # Nuclear device parameters
    nuclear_yield_megatons = 1.0  # 1 megaton device
    nuclear_yield_joules = nuclear_yield_megatons * 4.184e15
    
    # Convert to m/s
    asteroid_velocity_m_s = asteroid_velocity_km_s * 1000
    
    # Momentum transfer from nuclear explosion
    # Assume 10% of nuclear energy is converted to kinetic energy of asteroid
    kinetic_energy_joules = nuclear_yield_joules * 0.1
    
    # Calculate velocity change from kinetic energy
    # KE = 0.5 * m * v², so Δv = sqrt(2 * KE / m)
    velocity_change_m_s = math.sqrt(2 * kinetic_energy_joules / asteroid_mass_kg)
    velocity_change_km_s = velocity_change_m_s / 1000
    
    # Calculate deflection distance
    earth_radius_km = 6371
    deflection_distance_km = velocity_change_km_s * time_to_impact_days * 24
    
    # Effectiveness rating
    if deflection_distance_km > earth_radius_km * 3:
        effectiveness = 95
        status = "Maximum deflection - Earth safe"
    elif deflection_distance_km > earth_radius_km * 1.5:
        effectiveness = 85
        status = "Strong deflection - impact avoided"
    elif deflection_distance_km > earth_radius_km * 0.5:
        effectiveness = 60
        status = "Significant deflection - impact reduced"
    else:
        effectiveness = 25
        status = "Limited deflection - impact still likely"
    
    return {
        "method": "Nuclear Deflection",
        "velocity_change_km_s": round(velocity_change_km_s, 6),
        "deflection_distance_km": round(deflection_distance_km, 2),
        "effectiveness": effectiveness,
        "status": status,
        "time_required_days": 60,  # Mission preparation time
        "success_probability": min(90, max(40, effectiveness)),
        "description": f"Nuclear detonation changes asteroid velocity by {velocity_change_km_s:.4f} km/s"
    }
