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
