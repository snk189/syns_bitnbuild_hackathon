from __future__ import annotations
from typing import Dict, Any, List, Optional, Tuple
from ..simulation.models import BatteryState, HouseholdState, EVState

class ValidationResult:
    def __init__(self, is_valid: bool, reason: str = "", sanitized_value: Any = None):
        self.is_valid = is_valid
        self.reason = reason
        self.sanitized_value = sanitized_value

class SafetyValidator:
    """
    Deterministic Safety Gatekeeper:
    Validates and sanitizes all agent proposed actions prior to simulator execution.
    Guarantees physical and operational constraint compliance.
    """

    @staticmethod
    def validate_battery_dispatch(
        requested_power_kw: float,  # positive = discharge, negative = charge
        battery: BatteryState,
        step_hours: float = 0.25
    ) -> ValidationResult:
        if requested_power_kw > 0:
            # Discharging
            if requested_power_kw > battery.max_discharge_kw:
                sanitized = battery.max_discharge_kw
                return ValidationResult(
                    is_valid=False,
                    reason=f"Discharge request {requested_power_kw:.1f} kW exceeds inverter maximum {battery.max_discharge_kw:.1f} kW. Clamped.",
                    sanitized_value=sanitized
                )

            # Check SOC reserve limit
            usable_energy_kwh = max(0.0, (battery.soc_pct - battery.min_reserve_soc_pct) / 100.0 * battery.capacity_kwh)
            max_power_by_soc = usable_energy_kwh / step_hours
            if requested_power_kw > max_power_by_soc:
                sanitized = max(0.0, max_power_by_soc)
                return ValidationResult(
                    is_valid=False,
                    reason=f"Discharge {requested_power_kw:.1f} kW would violate minimum reserve SOC ({battery.min_reserve_soc_pct}%). Clamped to {sanitized:.1f} kW.",
                    sanitized_value=sanitized
                )

            return ValidationResult(is_valid=True, reason="Battery discharge within safe limits.", sanitized_value=requested_power_kw)

        elif requested_power_kw < 0:
            # Charging
            charge_power = abs(requested_power_kw)
            if charge_power > battery.max_charge_kw:
                sanitized = -battery.max_charge_kw
                return ValidationResult(
                    is_valid=False,
                    reason=f"Charge request {charge_power:.1f} kW exceeds inverter limit {battery.max_charge_kw:.1f} kW. Clamped.",
                    sanitized_value=sanitized
                )

            headroom_kwh = max(0.0, (100.0 - battery.soc_pct) / 100.0 * battery.capacity_kwh)
            max_charge_by_soc = headroom_kwh / step_hours
            if charge_power > max_charge_by_soc:
                sanitized = -max(0.0, max_charge_by_soc)
                return ValidationResult(
                    is_valid=False,
                    reason=f"Charge {charge_power:.1f} kW would overcharge battery past 100% SOC. Clamped to {-sanitized:.1f} kW.",
                    sanitized_value=sanitized
                )

            return ValidationResult(is_valid=True, reason="Battery charge within safe limits.", sanitized_value=requested_power_kw)

        return ValidationResult(is_valid=True, reason="Zero battery power requested.", sanitized_value=0.0)

    @staticmethod
    def validate_load_shedding(
        house: HouseholdState,
        requested_reduction_kw: float,
        current_flexible_kw: float
    ) -> ValidationResult:
        # Strictly forbidden: shedding base/critical loads
        if requested_reduction_kw < 0:
            return ValidationResult(is_valid=False, reason="Negative load reduction requested.", sanitized_value=0.0)

        if requested_reduction_kw > current_flexible_kw:
            return ValidationResult(
                is_valid=False,
                reason=f"Cannot shed {requested_reduction_kw:.1f} kW: exceeds available flexible load {current_flexible_kw:.1f} kW (Critical loads protected).",
                sanitized_value=current_flexible_kw
            )

        return ValidationResult(is_valid=True, reason="Flexible load reduction valid.", sanitized_value=requested_reduction_kw)

    @staticmethod
    def validate_ev_delay(
        ev: EVState,
        current_step: int,
        delay_requested: bool
    ) -> ValidationResult:
        if not delay_requested:
            return ValidationResult(is_valid=True, reason="EV charging on schedule.", sanitized_value=False)

        # Check if delaying charging makes it impossible to reach target SOC by deadline
        steps_remaining = ev.deadline_step - current_step
        if steps_remaining <= 0:
            return ValidationResult(
                is_valid=False,
                reason=f"EV {ev.ev_id} has reached its departure deadline ({ev.deadline_step}). Immediate charging mandatory.",
                sanitized_value=False
            )

        needed_energy_kwh = max(0.0, (ev.target_soc_pct - ev.current_soc_pct) / 100.0 * ev.capacity_kwh)
        steps_needed = needed_energy_kwh / (ev.charge_power_kw * 0.25 * 0.92)

        if steps_remaining <= steps_needed + 1:
            return ValidationResult(
                is_valid=False,
                reason=f"Cannot delay EV {ev.ev_id}: {steps_needed:.1f} charging steps needed before departure at step {ev.deadline_step}. Charging forced.",
                sanitized_value=False
            )

        return ValidationResult(is_valid=True, reason=f"EV {ev.ev_id} delay accepted within flexibility window.", sanitized_value=True)
