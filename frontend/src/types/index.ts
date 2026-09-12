export type GridStatus = "NORMAL" | "WARNING" | "CRITICAL";

export interface BatteryState {
  battery_id: string;
  capacity_kwh: number;
  soc_pct: number;
  max_charge_kw: number;
  max_discharge_kw: number;
  min_reserve_soc_pct: number;
  health_pct: number;
  current_power_kw: number;
  cycles: number;
}

export interface HouseholdState {
  house_id: string;
  name: string;
  base_load_kw: number;
  flexible_load_kw: number;
  current_reduction_kw: number;
  critical_load_kw: number;
  max_price_kwh: number;
  has_solar: boolean;
  solar_capacity_kw: number;
}

export interface EVState {
  ev_id: string;
  owner_id: string;
  capacity_kwh: number;
  current_soc_pct: number;
  target_soc_pct: number;
  charge_power_kw: number;
  is_charging: boolean;
  arrival_step: number;
  deadline_step: number;
  max_price_kwh: number;
  is_delayed: boolean;
}

export interface SolarProducerState {
  producer_id: string;
  name: string;
  capacity_kw: number;
  current_gen_kw: number;
  local_consumption_kw: number;
  surplus_kw: number;
  min_selling_price_kwh: number;
}

export interface P2PTrade {
  trade_id: string;
  step: number;
  time_str: string;
  seller_id: string;
  buyer_id: string;
  energy_kwh: number;
  price_kwh: number;
  total_value: number;
  status: string;
}

export interface AgentMessage {
  id: string;
  step: number;
  time_str: string;
  sender: string;
  receiver: string;
  message_type: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "EMERGENCY";
  content: string;
  action_requested?: string;
  response?: string;
  reasoning?: string;
}

export interface AgentDecisionLog {
  step: number;
  time_str: string;
  agent: string;
  observation: string;
  decision: string;
  reason: string;
  state: Record<string, any>;
  constraints: string[];
  tools_used: string[];
  timestamp: string;
}

export interface GridState {
  step: number;
  time_str: string;
  weather: "SUNNY" | "PARTLY_CLOUDY" | "OVERCAST" | "STORM";
  temperature_c: number;
  solar_irradiance_wm2: number;
  solar_total_kw: number;
  battery_discharge_kw: number;
  grid_import_kw: number;
  household_base_total_kw: number;
  household_flexible_total_kw: number;
  ev_charging_total_kw: number;
  battery_charge_kw: number;
  grid_export_kw: number;
  curtailed_solar_kw: number;
  total_supply_kw: number;
  total_demand_kw: number;
  balance_error_kw: number;
  transformer_capacity_kw: number;
  transformer_load_pct: number;
  voltage_pu: number;
  frequency_hz: number;
  status: GridStatus;
  grid_buy_price_kwh: number;
  grid_feed_in_price_kwh: number;
  p2p_clearing_price_kwh: number;
  p2p_volume_kwh: number;
  battery: BatteryState;
  households: HouseholdState[];
  evs: EVState[];
  solar_producers: SolarProducerState[];
}

export interface SimulationMetrics {
  mode: string;
  scenario: string;
  total_steps_run: number;
  peak_grid_demand_kw: number;
  total_grid_import_kwh: number;
  total_solar_generated_kwh: number;
  total_solar_curtailed_kwh: number;
  renewable_utilization_pct: number;
  total_cost: number;
  p2p_energy_traded_kwh: number;
  p2p_trade_count: number;
  battery_cycles_run: number;
  grid_violations_count: number;
  flexible_loads_shifted_count: number;
  estimated_co2_kg: number;
}

export interface SimulationComparison {
  baseline: SimulationMetrics;
  gridmind: SimulationMetrics;
  peak_demand_reduction_pct: number;
  grid_import_reduction_pct: number;
  cost_savings_pct: number;
  co2_reduction_pct: number;
  renewable_utilization_improvement_pct: number;
  p2p_volume_traded_kwh: number;
  violations_avoided: number;
}

export interface ComparisonData {
  comparison: SimulationComparison;
  chart_data: Array<{
    step: number;
    time: string;
    baseline_grid_import_kw: number;
    gridmind_grid_import_kw: number;
    baseline_transformer_load_pct: number;
    gridmind_transformer_load_pct: number;
    solar_generation_kw: number;
    baseline_battery_soc: number;
    gridmind_battery_soc: number;
    p2p_volume_kwh: number;
  }>;
}

export interface ScenarioInfo {
  id: string;
  title: string;
  description: string;
  weather: string;
  initial_battery_soc: number;
  demand_multiplier: number;
}
