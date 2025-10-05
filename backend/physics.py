"""
Impact physics calculations for asteroid simulator.
All formulas based on real impact physics and scaling laws.
"""

import math


def calculate_asteroid_density(absolute_magnitude_h: float, diameter_m: float) -> tuple:
    """
    Calculate asteroid density using taxonomic classification based on H-magnitude.
    Based on Carry (2012) density measurements and Bus-DeMeo taxonomy.
    
    Args:
        absolute_magnitude_h: Absolute magnitude H from NASA data
        diameter_m: Asteroid diameter in meters
        
    Returns:
        tuple: (density_kg_m3, asteroid_type, confidence)
    """
    # Taxonomic classification based on H-magnitude ranges
    # From research: smaller asteroids (higher H) tend to be C-type
    if absolute_magnitude_h > 22:  # Small asteroids, likely C-type
        density = 1410  # kg/m³ ± 690 (carbonaceous)
        asteroid_type = "C-type"
        confidence = 0.8
    elif absolute_magnitude_h > 18:  # Medium asteroids, likely S-type  
        density = 2700  # kg/m³ ± 690 (silicaceous)
        asteroid_type = "S-type"
        confidence = 0.7
    else:  # Large asteroids, mixed composition, conservative estimate
        density = 2700  # kg/m³ (conservative S-type)
        asteroid_type = "S-type"
        confidence = 0.6
    
    # Apply porosity correction for small asteroids
    if diameter_m < 100:  # Small asteroids are often rubble piles
        porosity_factor = 0.8  # 20% porosity
        density *= porosity_factor
        
    return density, asteroid_type, confidence


def calculate_impact(size_m: int, speed_km_s: float, angle: int, lat: float, lon: float, absolute_magnitude_h: float = None) -> dict:
    """
    Calculate asteroid impact effects using scientific formulas.

    Args:
        size_m: Asteroid diameter in meters
        speed_km_s: Velocity in km/s
        angle: Entry angle in degrees
        lat: Impact latitude
        lon: Impact longitude
        absolute_magnitude_h: NASA absolute magnitude for density calculation

    Returns:
        Dictionary with impact results
    """

    # 1. Mass calculation with scientific density
    radius_m = size_m / 2
    volume_m3 = (4/3) * math.pi * (radius_m ** 3)

    # Use scientific density calculation if H-magnitude available
    if absolute_magnitude_h:
        density_kg_m3, asteroid_type, confidence = calculate_asteroid_density(absolute_magnitude_h, size_m)
    else:
        # Fallback to S-type average if no H-magnitude data
        density_kg_m3 = 2700  # S-type average
        asteroid_type = "S-type (assumed)"
        confidence = 0.5
        
    mass_kg = volume_m3 * density_kg_m3

    # 2. Atmospheric entry deceleration (Collins et al. 2005)
    # Most small asteroids decelerate significantly in atmosphere
    entry_velocity_m_s = speed_km_s * 1000
    
    if size_m < 50:  # Small asteroids decelerate significantly
        # Simplified atmospheric deceleration model
        # Larger drag coefficient for small objects
        deceleration_factor = 0.7  # 30% velocity loss
        surface_velocity_m_s = entry_velocity_m_s * deceleration_factor
    elif size_m < 200:  # Medium asteroids have some deceleration
        deceleration_factor = 0.85  # 15% velocity loss
        surface_velocity_m_s = entry_velocity_m_s * deceleration_factor
    else:  # Large asteroids maintain most velocity
        deceleration_factor = 0.95  # 5% velocity loss
        surface_velocity_m_s = entry_velocity_m_s * deceleration_factor
    
    # Use surface velocity for energy calculations
    velocity_m_s = surface_velocity_m_s
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

    # 5. Scientific casualty calculation
    # Calculate area of total destruction zone
    total_destruction_area_km2 = math.pi * (total_destruction_km ** 2)
    
    # TODO: Replace with WorldPop API - for now use improved estimates
    # Urban vs rural population density (more realistic than fixed 1000)
    if abs(lat) < 60:  # Most populated latitudes
        if total_destruction_km < 5:  # Urban impact likely
            population_density = 3000  # Dense urban areas
        elif total_destruction_km < 20:  # Suburban areas
            population_density = 1000  # Suburban density
        else:  # Large impact affecting rural areas too
            population_density = 300   # Mixed urban/rural
    else:  # Higher latitudes, lower population
        population_density = 100
    
    affected_population = int(total_destruction_area_km2 * population_density)
    
    # Calculate overpressure at total destruction boundary (20 psi)
    overpressure_psi = 20  # At total destruction radius
    casualty_data = calculate_casualties_scientific(overpressure_psi, affected_population)

    # 6. Comparison string
    comparison = generate_comparison(energy_megatons)
    
    # Add scientific metadata
    impact_metadata = {
        "asteroid_type": asteroid_type if 'asteroid_type' in locals() else "Unknown",
        "density_used_kg_m3": density_kg_m3,
        "atmospheric_deceleration": f"{((entry_velocity_m_s - velocity_m_s) / entry_velocity_m_s * 100):.1f}%" if 'entry_velocity_m_s' in locals() else "0%",
        "population_density_used": population_density,
        "casualty_model": "Glasstone & Dolan (1977)"
    }

    return {
        "energy_megatons": round(energy_megatons, 3),
        "crater_diameter_km": round(crater_diameter_km, 2),
        "crater_depth_km": round(crater_depth_km, 2),
        "damage_zones": damage_zones,
        "deaths_estimated": casualty_data["fatalities"],
        "injuries_estimated": casualty_data["injuries"],
        "comparison": comparison,
        "scientific_metadata": impact_metadata
    }

def calculate_casualties_scientific(overpressure_psi: float, population: int) -> dict:
    """
    Calculate casualties using evidence-based mortality rates from nuclear test data.
    Based on Glasstone & Dolan (1977) nuclear weapons effects.
    
    Args:
        overpressure_psi: Blast overpressure in PSI
        population: Population in affected area
        
    Returns:
        Dictionary with fatalities, injuries, and survival rates
    """
    if overpressure_psi >= 55:
        fatality_rate = 0.99
        injury_rate = 0.01
    elif overpressure_psi >= 35:
        # Linear interpolation between 1% and 99% fatality
        fatality_rate = 0.01 + (overpressure_psi - 35) * 0.049  # 0.98/20
        injury_rate = 0.8 * (1 - fatality_rate)
    elif overpressure_psi >= 20:
        fatality_rate = 0.8  # Most people killed
        injury_rate = 0.15
    elif overpressure_psi >= 10:
        fatality_rate = 0.5  # Widespread fatalities
        injury_rate = 0.4
    elif overpressure_psi >= 5:
        fatality_rate = 0.05  # Injuries universal, fatalities widespread
        injury_rate = 0.7
    elif overpressure_psi >= 1:
        fatality_rate = 0.001  # Light injuries from fragments
        injury_rate = 0.1
    else:
        fatality_rate = 0
        injury_rate = 0
    
    fatalities = int(population * fatality_rate)
    injuries = int(population * injury_rate)
    survivors = population - fatalities - injuries
    
    return {
        "fatalities": fatalities,
        "injuries": injuries, 
        "survivors": survivors,
        "fatality_rate": fatality_rate,
        "injury_rate": injury_rate
    }

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


def validate_against_chelyabinsk() -> dict:
    """
    Validate our calculations against the Chelyabinsk meteor (2013).
    Known parameters: 18m diameter, 19.16 km/s entry, 500 kilotons energy
    """
    # Chelyabinsk parameters
    diameter_m = 18
    entry_velocity_km_s = 19.16
    h_magnitude = 26.0  # Estimated for 18m S-type
    
    # Our calculation
    result = calculate_impact(
        size_m=diameter_m,
        speed_km_s=entry_velocity_km_s,
        angle=18,  # Shallow entry angle
        lat=55.15,  # Chelyabinsk coordinates
        lon=61.41,
        absolute_magnitude_h=h_magnitude
    )
    
    # Expected vs calculated
    expected_energy_kt = 500
    calculated_energy_kt = result["energy_megatons"] * 1000
    
    validation = {
        "event": "Chelyabinsk 2013",
        "expected_energy_kt": expected_energy_kt,
        "calculated_energy_kt": round(calculated_energy_kt, 1),
        "error_percentage": abs(calculated_energy_kt - expected_energy_kt) / expected_energy_kt * 100,
        "within_uncertainty": abs(calculated_energy_kt - expected_energy_kt) < 250,  # ±50% uncertainty
        "scientific_improvements": result.get("scientific_metadata", {})
    }
    
    return validation


def validate_against_tunguska() -> dict:
    """
    Validate against Tunguska event (1908).
    Estimated: 60m diameter, 15 km/s, 10 megatons
    """
    # Tunguska estimated parameters
    diameter_m = 60
    velocity_km_s = 15
    h_magnitude = 22.0  # Estimated for 60m object
    
    result = calculate_impact(
        size_m=diameter_m,
        speed_km_s=velocity_km_s,
        angle=45,
        lat=60.9,   # Tunguska coordinates
        lon=101.9,
        absolute_magnitude_h=h_magnitude
    )
    
    expected_energy_mt = 10
    calculated_energy_mt = result["energy_megatons"]
    
    validation = {
        "event": "Tunguska 1908",
        "expected_energy_mt": expected_energy_mt,
        "calculated_energy_mt": round(calculated_energy_mt, 1),
        "error_percentage": abs(calculated_energy_mt - expected_energy_mt) / expected_energy_mt * 100,
        "within_uncertainty": abs(calculated_energy_mt - expected_energy_mt) < 5,  # ±50% uncertainty
        "scientific_improvements": result.get("scientific_metadata", {})
    }
    
    return validation


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


def validate_against_chelyabinsk() -> dict:
    """
    Validate our calculations against the Chelyabinsk meteor (2013).
    Known parameters: 18m diameter, 19.16 km/s entry, 500 kilotons energy
    """
    # Chelyabinsk parameters
    diameter_m = 18
    entry_velocity_km_s = 19.16
    h_magnitude = 26.0  # Estimated for 18m S-type
    
    # Our calculation
    result = calculate_impact(
        size_m=diameter_m,
        speed_km_s=entry_velocity_km_s,
        angle=18,  # Shallow entry angle
        lat=55.15,  # Chelyabinsk coordinates
        lon=61.41,
        absolute_magnitude_h=h_magnitude
    )
    
    # Expected vs calculated
    expected_energy_kt = 500
    calculated_energy_kt = result["energy_megatons"] * 1000
    
    validation = {
        "event": "Chelyabinsk 2013",
        "expected_energy_kt": expected_energy_kt,
        "calculated_energy_kt": round(calculated_energy_kt, 1),
        "error_percentage": abs(calculated_energy_kt - expected_energy_kt) / expected_energy_kt * 100,
        "within_uncertainty": abs(calculated_energy_kt - expected_energy_kt) < 250,  # ±50% uncertainty
        "scientific_improvements": result.get("scientific_metadata", {})
    }
    
    return validation


def validate_against_tunguska() -> dict:
    """
    Validate against Tunguska event (1908).
    Estimated: 60m diameter, 15 km/s, 10 megatons
    """
    # Tunguska estimated parameters
    diameter_m = 60
    velocity_km_s = 15
    h_magnitude = 22.0  # Estimated for 60m object
    
    result = calculate_impact(
        size_m=diameter_m,
        speed_km_s=velocity_km_s,
        angle=45,
        lat=60.9,   # Tunguska coordinates
        lon=101.9,
        absolute_magnitude_h=h_magnitude
    )
    
    expected_energy_mt = 10
    calculated_energy_mt = result["energy_megatons"]
    
    validation = {
        "event": "Tunguska 1908",
        "expected_energy_mt": expected_energy_mt,
        "calculated_energy_mt": round(calculated_energy_mt, 1),
        "error_percentage": abs(calculated_energy_mt - expected_energy_mt) / expected_energy_mt * 100,
        "within_uncertainty": abs(calculated_energy_mt - expected_energy_mt) < 5,  # ±50% uncertainty
        "scientific_improvements": result.get("scientific_metadata", {})
    }
    
    return validation
