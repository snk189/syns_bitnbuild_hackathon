from __future__ import annotations
import math
import copy
from typing import Dict, Any, List, Optional, Tuple
from .models import (
    GridState, GridStatus, WeatherCondition, BatteryState,
    HouseholdState, EVState, SolarProducerState, P2PTrade, SimulationMetrics
)
from .scenarios import SCENARIOS, ScenarioDefinition, get_default_households, get_default_evs, get_default_solar_producers

class MicrogridSimulator:
    def __init__(self, scenario_name: str = "cloud_cover_peak"):
        self.scenario_name = scenario_name
        self.scenario = SCENARIOS.get(scenario_name, SCENARIOS["cloud_cover_peak"])
        self.step_minutes = 15
        self.total_steps = 96  # 24 hours
        self.current_step = 0
        self.is_running = False
        self.speed_multiplier = 1.0
        self.crisis_triggered = False

        # Metrics accumulators
        self.total_grid_import_kwh = 0.0
        self.total_solar_generated_kwh = 0.0
        self.total_solar_curtailed_kwh = 0.0
        self.peak_grid_demand_kw = 0.0
        self.total_cost = 0.0
        self.total_energy_consumed_kwh = 0.0
        self.p2p_energy_traded_kwh = 0.0
        self.p2p_trade_count = 0
        self.grid_violations_count = 0
        self.flexible_loads_shifted_count = 0
        self.executed_trades: List[P2PTrade] = []

        # State storage
        self.history: List[GridState] = []
        self._initialize_assets()

    def _initialize_assets(self):
        self.battery = BatteryState(
            soc_pct=self.scenario.initial_battery_soc,
            capacity_kwh=120.0,
            max_charge_kw=35.0,
            max_discharge_kw=35.0,
            min_reserve_soc_pct=25.0
        )
        self.households = get_default_households()
        self.evs = get_default_evs()
        self.solar_producers = get_default_solar_producers()
        self._seed_baseline_trades()

    def _seed_baseline_trades(self):
        self.executed_trades = [
            P2PTrade(
                trade_id="TRD_BASE_01",
                step=0,
                time_str="00:00",
                seller_id="SOLAR_COMMUNITY_ROOF",
                buyer_id="HOUSE_02",
                power_kw=3.2,
                energy_kwh=0.8,
                price_kwh=8.5,
                total_value=6.8,
                status="EXECUTED"
            ),
            P2PTrade(
                trade_id="TRD_BASE_02",
                step=0,
                time_str="00:00",
                seller_id="SOLAR_FARM_MAIN",
                buyer_id="HOUSE_05",
                power_kw=4.0,
                energy_kwh=1.0,
                price_kwh=8.2,
                total_value=8.2,
                status="EXECUTED"
            ),
            P2PTrade(
                trade_id="TRD_BASE_03",
                step=0,
                time_str="00:00",
                seller_id="SOLAR_FARM_MAIN",
                buyer_id="HOUSE_08",
                power_kw=2.8,
                energy_kwh=0.7,
                price_kwh=8.5,
                total_value=5.95,
                status="EXECUTED"
            )
        ]

    def reset(self, scenario_name: Optional[str] = None):
        if scenario_name:
            self.scenario_name = scenario_name
            self.scenario = SCENARIOS.get(scenario_name, SCENARIOS["cloud_cover_peak"])
        self.current_step = 0
        self.is_running = False
        self.crisis_triggered = False
        self.total_grid_import_kwh = 0.0
        self.total_solar_generated_kwh = 0.0
        self.total_solar_curtailed_kwh = 0.0
        self.peak_grid_demand_kw = 0.0
        self.total_cost = 0.0
        self.total_energy_consumed_kwh = 0.0
        self.p2p_energy_traded_kwh = 0.0
        self.p2p_trade_count = 0
        self.grid_violations_count = 0
        self.flexible_loads_shifted_count = 0
        self._seed_baseline_trades()
        self.history = []
        self._initialize_assets()

    def trigger_crisis(self):
        """Manually trigger immediate crisis: severe cloud cover + demand surge."""
        self.crisis_triggered = True

    def step_to_time_str(self, step: int) -> str:
        total_mins = step * self.step_minutes
        h = (total_mins // 60) % 24
        m = total_mins % 60
        return f"{h:02d}:{m:02d}"

    def calculate_solar_irradiance(self, step: int) -> Tuple[float, WeatherCondition]:
        # Sunrise ~ 06:00 (step 24), Sunset ~ 19:00 (step 76), solar noon ~ step 50
        if step < 24 or step > 76:
            return 0.0, WeatherCondition.SUNNY

        # Base diurnal bell curve
        theta = math.pi * (step - 24) / 52.0
        base_irradiance = math.sin(theta) * 950.0 * self.scenario.solar_modifier

        # Weather / cloud impact
        weather = self.scenario.weather_pattern
        cloud_factor = 1.0

        if self.scenario.cloud_event_step_start and self.scenario.cloud_event_step_end:
            if self.scenario.cloud_event_step_start <= step <= self.scenario.cloud_event_step_end:
                cloud_factor = 0.15  # 85% drop
                weather = WeatherCondition.OVERCAST

        if self.crisis_triggered and step >= 70:
            cloud_factor = min(cloud_factor, 0.12)
            weather = WeatherCondition.STORM

        return max(0.0, base_irradiance * cloud_factor), weather

    def calculate_household_base_profile(self, step: int) -> float:
        # Time of day residential curve multiplier (0.35 to 1.35)
        hour = (step * self.step_minutes) / 60.0
        if hour < 6.0:
            mult = 0.35 + 0.05 * math.sin(hour)
        elif 6.0 <= hour < 9.0:
            mult = 0.75 + 0.25 * math.sin((hour - 6.0) / 3.0 * math.pi)
        elif 9.0 <= hour < 17.0:
            mult = 0.55 + 0.10 * math.sin((hour - 9.0) / 8.0 * math.pi)
        elif 17.0 <= hour < 22.0:
            # Evening dinner & peak
            peak_intensity = math.sin((hour - 17.0) / 5.0 * math.pi)
            mult = 1.0 + 0.35 * peak_intensity * self.scenario.demand_spike_factor
            if self.crisis_triggered and step >= 74:
                mult *= 1.25  # Crisis demand surge
        else:
            mult = 0.65 - 0.25 * ((hour - 22.0) / 2.0)
        return mult

    def apply_simulation_step(
        self,
        battery_action_kw: float = 0.0,  # positive = discharge, negative = charge
        flexible_load_reductions: Optional[Dict[str, float]] = None,
        ev_charging_overrides: Optional[Dict[str, bool]] = None,
        p2p_trades_this_step: Optional[List[P2PTrade]] = None
    ) -> GridState:
        """
        Executes one deterministic physics step preserving conservation of energy.
        """
        step = self.current_step
        time_str = self.step_to_time_str(step)
        dt_hours = self.step_minutes / 60.0  # 0.25h

        irradiance_wm2, weather = self.calculate_solar_irradiance(step)
        load_mult = self.calculate_household_base_profile(step)

        # 1. Calculate Solar Generation
        solar_total_kw = 0.0
        for producer in self.solar_producers:
            # Efficiency ~18% relative to 1000 W/m2 STC
            gen_kw = producer.capacity_kw * (irradiance_wm2 / 1000.0)
            producer.current_gen_kw = round(gen_kw, 2)
            solar_total_kw += gen_kw

        # 2. Calculate Household Demand
        flexible_reductions = flexible_load_reductions or {}
        household_base_kw = 0.0
        household_flex_kw = 0.0
        for h in self.households:
            base = h.base_load_kw * load_mult
            flex = h.flexible_load_kw * load_mult
            reduction = flexible_reductions.get(h.house_id, 0.0)
            # Cannot reduce below 0 or above available flexible load
            reduction = max(0.0, min(flex, reduction))
            h.current_reduction_kw = round(reduction, 2)
            household_base_kw += base
            household_flex_kw += (flex - reduction)
            if reduction > 0.01:
                self.flexible_loads_shifted_count += 1

        # 3. Calculate EV Demand
        ev_charging_kw = 0.0
        ev_overrides = ev_charging_overrides or {}
        for ev in self.evs:
            # Determine if EV is plugged in
            is_present = (ev.arrival_step <= step <= ev.deadline_step)
            needs_charge = (ev.current_soc_pct < ev.target_soc_pct)

            # Check if charging allowed or delayed
            should_charge = is_present and needs_charge
            if ev.ev_id in ev_overrides:
                should_charge = should_charge and ev_overrides[ev.ev_id]

            if should_charge:
                ev.is_charging = True
                ev.is_delayed = False
                ev_charging_kw += ev.charge_power_kw
                # Update EV battery SOC
                energy_added_kwh = ev.charge_power_kw * dt_hours * 0.92  # 92% charger efficiency
                soc_gain = (energy_added_kwh / ev.capacity_kwh) * 100.0
                ev.current_soc_pct = min(ev.target_soc_pct, ev.current_soc_pct + soc_gain)
            else:
                ev.is_charging = False
                if is_present and needs_charge:
                    ev.is_delayed = True

        total_consumption_kw = household_base_kw + household_flex_kw + ev_charging_kw

        # 4. Battery Dynamics & Constraints Validation
        # positive battery_action_kw = discharge, negative = charge
        batt = self.battery
        actual_battery_power_kw = 0.0

        if battery_action_kw > 0:
            # Discharging
            max_avail_discharge = min(batt.max_discharge_kw, battery_action_kw)
            # Energy available before hitting min reserve
            energy_avail_kwh = max(0.0, (batt.soc_pct - batt.min_reserve_soc_pct) / 100.0 * batt.capacity_kwh)
            power_limited_by_soc = energy_avail_kwh / dt_hours
            actual_battery_power_kw = min(max_avail_discharge, power_limited_by_soc)
            # Deplete SOC
            energy_discharged = actual_battery_power_kw * dt_hours
            batt.soc_pct = max(batt.min_reserve_soc_pct, batt.soc_pct - (energy_discharged / batt.capacity_kwh * 100.0))
            battery_discharge_kw = actual_battery_power_kw
            battery_charge_kw = 0.0
            batt.cycles += round(energy_discharged / (batt.capacity_kwh * 2.0), 4)
        elif battery_action_kw < 0:
            # Charging
            charge_request = abs(battery_action_kw)
            max_avail_charge = min(batt.max_charge_kw, charge_request)
            room_kwh = max(0.0, (100.0 - batt.soc_pct) / 100.0 * batt.capacity_kwh)
            power_limited_by_soc = room_kwh / dt_hours
            actual_battery_power_kw = -min(max_avail_charge, power_limited_by_soc)
            energy_charged = abs(actual_battery_power_kw) * dt_hours * 0.95  # 95% roundtrip efficiency
            batt.soc_pct = min(100.0, batt.soc_pct + (energy_charged / batt.capacity_kwh * 100.0))
            battery_discharge_kw = 0.0
            battery_charge_kw = abs(actual_battery_power_kw)
            batt.cycles += round(energy_charged / (batt.capacity_kwh * 2.0), 4)
        else:
            battery_discharge_kw = 0.0
            battery_charge_kw = 0.0

        batt.current_power_kw = round(actual_battery_power_kw, 2)

        # 5. Energy Balance Calculation (Supply = Demand)
        # Supply: Solar + Battery Discharge + Grid Import
        # Demand: Household + EV + Battery Charge + Grid Export
        net_local_balance = (solar_total_kw + battery_discharge_kw) - (total_consumption_kw + battery_charge_kw)

        if net_local_balance < 0:
            # Deficit: Must import from the main grid
            grid_import_kw = abs(net_local_balance)
            grid_export_kw = 0.0
            curtailed_solar_kw = 0.0
        else:
            # Surplus: Export to the main grid
            grid_import_kw = 0.0
            grid_export_kw = net_local_balance
            curtailed_solar_kw = 0.0

        total_supply_kw = solar_total_kw + battery_discharge_kw + grid_import_kw
        total_demand_kw = total_consumption_kw + battery_charge_kw + grid_export_kw
        balance_error = abs(total_supply_kw - total_demand_kw)

        # 6. Electrical State: Transformer Loading, Voltage, Frequency
        transformer_capacity = self.scenario.transformer_capacity_kw
        transformer_load_pct = (max(grid_import_kw, grid_export_kw) / transformer_capacity) * 100.0

        if transformer_load_pct >= 95.0:
            status = GridStatus.CRITICAL
            self.grid_violations_count += 1
        elif transformer_load_pct >= 80.0:
            status = GridStatus.WARNING
        else:
            status = GridStatus.NORMAL

        # Realistic voltage & frequency variations
        voltage_pu = round(1.0 - 0.05 * (grid_import_kw / transformer_capacity) + 0.02 * (grid_export_kw / transformer_capacity), 3)
        frequency_hz = round(50.0 - 0.015 * ((transformer_load_pct - 65.0) / 35.0), 2)

        # 7. Market & Cost Metrics
        trades = p2p_trades_this_step or []
        p2p_step_kwh = sum(t.energy_kwh for t in trades)
        self.p2p_energy_traded_kwh += p2p_step_kwh
        self.p2p_trade_count += len(trades)
        self.executed_trades.extend(trades)

        grid_buy_price = 13.5  # Rs / kWh
        grid_feed_in_price = 4.0

        step_import_kwh = grid_import_kw * dt_hours
        step_export_kwh = grid_export_kw * dt_hours
        self.total_grid_import_kwh += step_import_kwh
        self.total_solar_generated_kwh += solar_total_kw * dt_hours
        self.total_energy_consumed_kwh += total_consumption_kw * dt_hours
        self.peak_grid_demand_kw = max(self.peak_grid_demand_kw, grid_import_kw)

        # Cost = Grid Imports - Grid Exports (Feed-in)
        step_cost = (step_import_kwh * grid_buy_price) - (step_export_kwh * grid_feed_in_price)
        self.total_cost += step_cost

        # Construct snapshot
        state = GridState(
            step=step,
            time_str=time_str,
            weather=weather,
            solar_total_kw=round(solar_total_kw, 2),
            battery_discharge_kw=round(battery_discharge_kw, 2),
            grid_import_kw=round(grid_import_kw, 2),
            household_base_total_kw=round(household_base_kw, 2),
            household_flexible_total_kw=round(household_flex_kw, 2),
            ev_charging_total_kw=round(ev_charging_kw, 2),
            battery_charge_kw=round(battery_charge_kw, 2),
            grid_export_kw=round(grid_export_kw, 2),
            curtailed_solar_kw=round(curtailed_solar_kw, 2),
            total_supply_kw=round(total_supply_kw, 2),
            total_demand_kw=round(total_demand_kw, 2),
            balance_error_kw=round(balance_error, 4),
            transformer_capacity_kw=transformer_capacity,
            transformer_load_pct=round(transformer_load_pct, 1),
            voltage_pu=voltage_pu,
            frequency_hz=frequency_hz,
            status=status,
            p2p_volume_kwh=round(p2p_step_kwh, 2),
            p2p_clearing_price_kwh=8.5,
            battery=copy.deepcopy(batt),
            households=copy.deepcopy(self.households),
            evs=copy.deepcopy(self.evs),
            solar_producers=copy.deepcopy(self.solar_producers)
        )

        self.history.append(state)
        self.current_step += 1
        return state

    def get_metrics(self, mode: str = "GRIDMIND") -> SimulationMetrics:
        renewable_utilized_kwh = self.total_solar_generated_kwh - self.total_solar_curtailed_kwh
        renewable_pct = 0.0
        if self.total_energy_consumed_kwh > 0:
            renewable_pct = min(100.0, (renewable_utilized_kwh / self.total_energy_consumed_kwh) * 100.0)

        # CO2 emissions: ~0.82 kg CO2 per kWh of grid electricity import
        co2_kg = self.total_grid_import_kwh * 0.82

        return SimulationMetrics(
            mode=mode,
            scenario=self.scenario.title,
            total_steps_run=self.current_step,
            peak_grid_demand_kw=round(self.peak_grid_demand_kw, 2),
            total_grid_import_kwh=round(self.total_grid_import_kwh, 2),
            total_solar_generated_kwh=round(self.total_solar_generated_kwh, 2),
            total_solar_curtailed_kwh=round(self.total_solar_curtailed_kwh, 2),
            renewable_utilization_pct=round(renewable_pct, 1),
            total_cost=round(self.total_cost, 2),
            p2p_energy_traded_kwh=round(self.p2p_energy_traded_kwh, 2),
            p2p_trade_count=self.p2p_trade_count,
            battery_cycles_run=round(self.battery.cycles - 142.2, 3),
            grid_violations_count=self.grid_violations_count,
            flexible_loads_shifted_count=self.flexible_loads_shifted_count,
            estimated_co2_kg=round(co2_kg, 2)
        )
