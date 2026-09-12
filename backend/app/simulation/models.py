from __future__ import annotations
from enum import Enum
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class GridStatus(str, Enum):
    NORMAL = "NORMAL"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"

class WeatherCondition(str, Enum):
    SUNNY = "SUNNY"
    PARTLY_CLOUDY = "PARTLY_CLOUDY"
    OVERCAST = "OVERCAST"
    STORM = "STORM"

class BatteryState(BaseModel):
    battery_id: str = "BATT_CENTRAL_01"
    capacity_kwh: float = 120.0
    soc_pct: float = 75.0  # 0 to 100
    max_charge_kw: float = 35.0
    max_discharge_kw: float = 35.0
    min_reserve_soc_pct: float = 25.0
    health_pct: float = 98.5
    current_power_kw: float = 0.0  # positive = discharging, negative = charging
    cycles: float = 142.2

class HouseholdState(BaseModel):
    house_id: str
    name: str
    base_load_kw: float
    flexible_load_kw: float
    current_reduction_kw: float = 0.0
    critical_load_kw: float
    max_price_kwh: float
    has_solar: bool = False
    solar_capacity_kw: float = 0.0

class EVState(BaseModel):
    ev_id: str
    owner_id: str
    capacity_kwh: float = 60.0
    current_soc_pct: float = 40.0
    target_soc_pct: float = 85.0
    charge_power_kw: float = 7.2
    is_charging: bool = False
    arrival_step: int = 70  # ~17:30
    deadline_step: int = 90  # ~22:30
    max_price_kwh: float = 12.0
    is_delayed: bool = False

class SolarProducerState(BaseModel):
    producer_id: str
    name: str
    capacity_kw: float
    current_gen_kw: float = 0.0
    local_consumption_kw: float = 0.0
    surplus_kw: float = 0.0
    min_selling_price_kwh: float = 6.0

class P2PTrade(BaseModel):
    trade_id: str
    step: int
    time_str: str
    seller_id: str
    buyer_id: str
    energy_kwh: float
    price_kwh: float
    total_value: float
    status: str = "EXECUTED"

class AgentMessage(BaseModel):
    id: str
    step: int
    time_str: str
    sender: str
    receiver: str
    message_type: str  # ADVISORY, BID, ASK, DISPATCH, ALERT, TRADE_CONFIRM
    priority: str = "NORMAL"  # LOW, NORMAL, HIGH, EMERGENCY
    content: str
    action_requested: Optional[str] = None
    response: Optional[str] = None
    reasoning: Optional[str] = None

class AgentDecisionLog(BaseModel):
    timestamp: str
    step: int
    agent: str
    observation: str
    state: Dict[str, Any]
    decision: str
    reason: str
    constraints: List[str] = Field(default_factory=list)
    tools_used: List[str] = Field(default_factory=list)
    status: str = "SUCCESS"

class GridState(BaseModel):
    step: int  # 0 to 95 for 15-min intervals
    time_str: str  # "18:30"
    weather: WeatherCondition
    temperature_c: float = 24.0
    solar_irradiance_wm2: float = 650.0

    # Generation (kW)
    solar_total_kw: float
    battery_discharge_kw: float
    grid_import_kw: float

    # Consumption (kW)
    household_base_total_kw: float
    household_flexible_total_kw: float
    ev_charging_total_kw: float
    battery_charge_kw: float
    grid_export_kw: float
    curtailed_solar_kw: float = 0.0

    # Total balances
    total_supply_kw: float
    total_demand_kw: float
    balance_error_kw: float = 0.0

    # Electrical parameters
    transformer_capacity_kw: float = 120.0
    transformer_load_pct: float
    voltage_pu: float = 1.0  # Per-unit voltage (0.95 - 1.05 normal)
    frequency_hz: float = 50.0
    status: GridStatus

    # Market rates
    grid_buy_price_kwh: float = 13.5  # Standard retail tariff
    grid_feed_in_price_kwh: float = 4.0  # Surplus sellback rate
    p2p_clearing_price_kwh: float = 8.5
    p2p_volume_kwh: float = 0.0

    # Assets state
    battery: BatteryState
    households: List[HouseholdState]
    evs: List[EVState]
    solar_producers: List[SolarProducerState]

class SimulationMetrics(BaseModel):
    mode: str  # "BASELINE" or "GRIDMIND"
    scenario: str
    total_steps_run: int
    peak_grid_demand_kw: float
    total_grid_import_kwh: float
    total_solar_generated_kwh: float
    total_solar_curtailed_kwh: float
    renewable_utilization_pct: float
    total_cost: float
    p2p_energy_traded_kwh: float
    p2p_trade_count: int
    battery_cycles_run: float
    grid_violations_count: int
    flexible_loads_shifted_count: int
    estimated_co2_kg: float

class SimulationComparison(BaseModel):
    baseline: SimulationMetrics
    gridmind: SimulationMetrics
    peak_demand_reduction_pct: float
    grid_import_reduction_pct: float
    cost_savings_pct: float
    co2_reduction_pct: float
    renewable_utilization_improvement_pct: float
    p2p_volume_traded_kwh: float
    violations_avoided: int
