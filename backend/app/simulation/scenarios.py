from __future__ import annotations
import math
from typing import Dict, Any, List
from .models import WeatherCondition, HouseholdState, EVState, SolarProducerState, BatteryState

def get_default_households() -> List[HouseholdState]:
    return [
        HouseholdState(
            house_id="H_NORTH_1",
            name="North Residence A (Family of 4)",
            base_load_kw=2.8,
            flexible_load_kw=1.8,
            critical_load_kw=1.2,
            max_price_kwh=11.5,
            has_solar=True,
            solar_capacity_kw=5.0
        ),
        HouseholdState(
            house_id="H_NORTH_2",
            name="North Residence B (Retirees)",
            base_load_kw=1.5,
            flexible_load_kw=0.8,
            critical_load_kw=1.0,
            max_price_kwh=10.0,
            has_solar=False,
            solar_capacity_kw=0.0
        ),
        HouseholdState(
            house_id="H_SOUTH_1",
            name="South Residence C (Tech Couple)",
            base_load_kw=3.2,
            flexible_load_kw=2.2,
            critical_load_kw=1.5,
            max_price_kwh=12.0,
            has_solar=True,
            solar_capacity_kw=6.5
        ),
        HouseholdState(
            house_id="H_SOUTH_2",
            name="South Residence D (Solar Prosumer)",
            base_load_kw=2.0,
            flexible_load_kw=1.2,
            critical_load_kw=1.0,
            max_price_kwh=11.0,
            has_solar=True,
            solar_capacity_kw=12.0
        ),
        HouseholdState(
            house_id="COMMUNITY_CENTER",
            name="Microgrid Community Hall & Clinic",
            base_load_kw=6.0,
            flexible_load_kw=3.5,
            critical_load_kw=4.0,  # Clinic refrigeration & medical equipment
            max_price_kwh=14.0,
            has_solar=True,
            solar_capacity_kw=15.0
        ),
        HouseholdState(
            house_id="H_EAST_1",
            name="East Apartment Complex",
            base_load_kw=14.0,
            flexible_load_kw=8.0,
            critical_load_kw=7.0,
            max_price_kwh=12.5,
            has_solar=False,
            solar_capacity_kw=0.0
        ),
        HouseholdState(
            house_id="H_WEST_1",
            name="West Eco-Homes Cluster",
            base_load_kw=8.5,
            flexible_load_kw=5.0,
            critical_load_kw=4.0,
            max_price_kwh=11.0,
            has_solar=True,
            solar_capacity_kw=20.0
        )
    ]

def get_default_evs() -> List[EVState]:
    return [
        EVState(
            ev_id="EV_FLEET_01",
            owner_id="H_NORTH_1",
            capacity_kwh=60.0,
            current_soc_pct=35.0,
            target_soc_pct=85.0,
            charge_power_kw=7.2,
            arrival_step=70,  # 17:30
            deadline_step=88,  # 22:00
            max_price_kwh=12.0
        ),
        EVState(
            ev_id="EV_FLEET_02",
            owner_id="H_SOUTH_1",
            capacity_kwh=75.0,
            current_soc_pct=25.0,
            target_soc_pct=80.0,
            charge_power_kw=11.0,
            arrival_step=72,  # 18:00
            deadline_step=92,  # 23:00
            max_price_kwh=13.0
        ),
        EVState(
            ev_id="EV_COMMUNITY_VAN",
            owner_id="COMMUNITY_CENTER",
            capacity_kwh=80.0,
            current_soc_pct=45.0,
            target_soc_pct=90.0,
            charge_power_kw=14.0,
            arrival_step=68,  # 17:00
            deadline_step=86,  # 21:30
            max_price_kwh=11.0
        ),
        EVState(
            ev_id="EV_FLEET_03",
            owner_id="H_EAST_1",
            capacity_kwh=50.0,
            current_soc_pct=30.0,
            target_soc_pct=80.0,
            charge_power_kw=7.2,
            arrival_step=74,  # 18:30
            deadline_step=94,  # 23:30
            max_price_kwh=12.5
        )
    ]

def get_default_solar_producers() -> List[SolarProducerState]:
    return [
        SolarProducerState(
            producer_id="SOLAR_FARM_MAIN",
            name="Community Solar Array East",
            capacity_kw=55.0,
            min_selling_price_kwh=5.5
        ),
        SolarProducerState(
            producer_id="SOLAR_COMMUNITY_ROOF",
            name="Community Hall Solar Array",
            capacity_kw=15.0,
            min_selling_price_kwh=6.0
        ),
        SolarProducerState(
            producer_id="SOLAR_RESIDENTIAL_PROSUMERS",
            name="Aggregated Prosumer Rooftops",
            capacity_kw=38.5,
            min_selling_price_kwh=6.5
        )
    ]

class ScenarioDefinition:
    def __init__(
        self,
        name: str,
        title: str,
        description: str,
        initial_battery_soc: float = 75.0,
        weather_pattern: WeatherCondition = WeatherCondition.SUNNY,
        cloud_event_step_start: Optional[int] = None,
        cloud_event_step_end: Optional[int] = None,
        demand_spike_factor: float = 1.0,
        solar_modifier: float = 1.0,
        transformer_capacity_kw: float = 120.0
    ):
        self.name = name
        self.title = title
        self.description = description
        self.initial_battery_soc = initial_battery_soc
        self.weather_pattern = weather_pattern
        self.cloud_event_step_start = cloud_event_step_start
        self.cloud_event_step_end = cloud_event_step_end
        self.demand_spike_factor = demand_spike_factor
        self.solar_modifier = solar_modifier
        self.transformer_capacity_kw = transformer_capacity_kw

SCENARIOS: Dict[str, ScenarioDefinition] = {
    "normal_day": ScenarioDefinition(
        name="normal_day",
        title="Scenario 1 — Normal Day",
        description="Moderate demand, clear skies, standard diurnal solar profile, steady grid operation.",
        initial_battery_soc=70.0,
        weather_pattern=WeatherCondition.SUNNY,
        solar_modifier=1.0,
        demand_spike_factor=1.0
    ),
    "evening_peak": ScenarioDefinition(
        name="evening_peak",
        title="Scenario 2 — Evening Peak",
        description="Solar declines smoothly towards sunset as evening household cooking and heating ramps up.",
        initial_battery_soc=75.0,
        weather_pattern=WeatherCondition.SUNNY,
        solar_modifier=1.0,
        demand_spike_factor=1.25
    ),
    "cloud_cover_peak": ScenarioDefinition(
        name="cloud_cover_peak",
        title="Scenario 3 — Cloud Cover + Evening Peak (Main Demo)",
        description="Sudden cloud cover strikes at 18:30 (step 74), plunging solar by 85% exactly as EVs plug in and dinner demand peaks.",
        initial_battery_soc=75.0,
        weather_pattern=WeatherCondition.PARTLY_CLOUDY,
        cloud_event_step_start=74,  # 18:30
        cloud_event_step_end=88,    # 22:00
        solar_modifier=1.0,
        demand_spike_factor=1.35
    ),
    "solar_surplus": ScenarioDefinition(
        name="solar_surplus",
        title="Scenario 4 — Solar Surplus",
        description="Peak midday solar generation with high irradiance. Highlights P2P trading and battery charging.",
        initial_battery_soc=45.0,
        weather_pattern=WeatherCondition.SUNNY,
        solar_modifier=1.4,
        demand_spike_factor=0.9
    ),
    "battery_low_soc": ScenarioDefinition(
        name="battery_low_soc",
        title="Scenario 5 — Battery Low SOC",
        description="Central battery starts depleted near 22% reserve limit. Battery agent refuses discharge, forcing intelligent load and EV curtailment.",
        initial_battery_soc=22.0,
        weather_pattern=WeatherCondition.PARTLY_CLOUDY,
        cloud_event_step_start=74,
        cloud_event_step_end=86,
        solar_modifier=0.9,
        demand_spike_factor=1.2
    ),
    "grid_emergency": ScenarioDefinition(
        name="grid_emergency",
        title="Scenario 6 — Grid Emergency Mode",
        description="Extreme demand surge coupled with partial generator outage pushing transformer to 135% overload. Triggers Emergency Priority protocol.",
        initial_battery_soc=60.0,
        weather_pattern=WeatherCondition.STORM,
        cloud_event_step_start=70,
        cloud_event_step_end=92,
        solar_modifier=0.4,
        demand_spike_factor=1.6,
        transformer_capacity_kw=110.0
    )
}
