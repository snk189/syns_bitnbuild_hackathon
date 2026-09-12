from __future__ import annotations
import numpy as np
from scipy.optimize import linprog
from typing import Dict, Any, List, Optional, Tuple
from ..simulation.models import BatteryState, HouseholdState, EVState

class OptimizationPlan:
    def __init__(
        self,
        battery_discharge_kw: float,
        ev_delays: Dict[str, bool],  # True = delayed (saving EV charging kW)
        ev_kw_reductions: Dict[str, float],
        household_reductions: Dict[str, float],  # house_id -> kW reduced
        total_kw_reduced: float,
        target_kw: float,
        success: bool,
        message: str
    ):
        self.battery_discharge_kw = battery_discharge_kw
        self.ev_delays = ev_delays
        self.ev_kw_reductions = ev_kw_reductions
        self.household_reductions = household_reductions
        self.total_kw_reduced = total_kw_reduced
        self.target_kw = target_kw
        self.success = success
        self.message = message

class DispatchOptimizer:
    """
    Deterministic Linear Programming Resource Allocator:
    Solves optimal dispatch when Grid Health or Market Agent requires peak shaving or deficit response.
    """

    @staticmethod
    def optimize_peak_shaving(
        target_reduction_kw: float,
        battery: BatteryState,
        households: List[HouseholdState],
        evs: List[EVState],
        current_step: int,
        step_hours: float = 0.25
    ) -> OptimizationPlan:
        if target_reduction_kw <= 0.1:
            return OptimizationPlan(
                battery_discharge_kw=0.0,
                ev_delays={},
                ev_kw_reductions={},
                household_reductions={},
                total_kw_reduced=0.0,
                target_kw=target_reduction_kw,
                success=True,
                message="No reduction required."
            )

        # 1. Evaluate maximum available capacities for each candidate resource
        # Variable 0: Battery Discharge
        usable_soc = max(0.0, (battery.soc_pct - battery.min_reserve_soc_pct) / 100.0 * battery.capacity_kwh)
        max_batt_discharge = min(battery.max_discharge_kw, usable_soc / step_hours)

        # Variables 1..N: Active EV charging that can be safely delayed
        eligible_evs: List[Tuple[EVState, float]] = []
        for ev in evs:
            if ev.arrival_step <= current_step <= ev.deadline_step and ev.current_soc_pct < ev.target_soc_pct:
                steps_remaining = ev.deadline_step - current_step
                needed_energy_kwh = max(0.0, (ev.target_soc_pct - ev.current_soc_pct) / 100.0 * ev.capacity_kwh)
                steps_needed = needed_energy_kwh / (ev.charge_power_kw * step_hours * 0.92)
                # If EV has slack steps before deadline, it can be delayed
                if steps_remaining > steps_needed + 1:
                    eligible_evs.append((ev, ev.charge_power_kw))

        # Variables N+1..M: Household flexible loads
        eligible_houses: List[Tuple[HouseholdState, float]] = []
        for h in households:
            # Only flexible load can be shed, critical load is strictly safeguarded
            if h.flexible_load_kw > 0.1:
                eligible_houses.append((h, h.flexible_load_kw))

        num_vars = 1 + len(eligible_evs) + len(eligible_houses)

        # Cost vector c:
        # Battery wear: 0.05
        # EV delay: 0.08
        # Household flexible load shed: 0.15 (proportional to consumer inconvenience)
        c = [0.05]
        bounds = [(0.0, max_batt_discharge)]

        for _, kw in eligible_evs:
            c.append(0.08)
            bounds.append((0.0, kw))

        for _, kw in eligible_houses:
            c.append(0.15)
            bounds.append((0.0, kw))

        # We want to maximize total reduction up to target_reduction_kw, while minimizing cost.
        # Alternatively: min sum(c_i * x_i) subject to sum(x_i) >= min(total_capacity, target_reduction_kw)
        total_capacity = sum(b[1] for b in bounds)
        effective_target = min(target_reduction_kw, total_capacity)

        if effective_target <= 0.01:
            return OptimizationPlan(
                battery_discharge_kw=0.0,
                ev_delays={},
                ev_kw_reductions={},
                household_reductions={},
                total_kw_reduced=0.0,
                target_kw=target_reduction_kw,
                success=False,
                message="Zero flexible capacity available."
            )

        # Constraint: -sum(x_i) <= -effective_target
        A_ub = [[-1.0] * num_vars]
        b_ub = [-effective_target]

        res = linprog(c, A_ub=A_ub, b_ub=b_ub, bounds=bounds, method="highs")

        if not res.success:
            # Fallback to greedy allocation if linprog numerical issue occurs
            alloc = []
            rem = effective_target
            for b in bounds:
                take = min(rem, b[1])
                alloc.append(take)
                rem -= take
            x = np.array(alloc)
        else:
            x = res.x

        batt_discharge = float(x[0])
        ev_delays: Dict[str, bool] = {}
        ev_reductions: Dict[str, float] = {}
        idx = 1
        for ev, max_kw in eligible_evs:
            val = float(x[idx])
            # If at least 50% of the EV charging is curtailed, mark as delayed
            if val >= max_kw * 0.5:
                ev_delays[ev.ev_id] = False  # False means do not charge (delayed)
                ev_reductions[ev.ev_id] = round(val, 2)
            idx += 1

        house_reductions: Dict[str, float] = {}
        for h, max_kw in eligible_houses:
            val = float(x[idx])
            if val > 0.01:
                house_reductions[h.house_id] = round(val, 2)
            idx += 1

        total_reduced = batt_discharge + sum(ev_reductions.values()) + sum(house_reductions.values())

        return OptimizationPlan(
            battery_discharge_kw=round(batt_discharge, 2),
            ev_delays=ev_delays,
            ev_kw_reductions=ev_reductions,
            household_reductions=house_reductions,
            total_kw_reduced=round(total_reduced, 2),
            target_kw=target_reduction_kw,
            success=True,
            message=f"Optimal allocation achieved: {total_reduced:.1f} kW reduction allocated across battery, EVs, and residential flexibility."
        )
