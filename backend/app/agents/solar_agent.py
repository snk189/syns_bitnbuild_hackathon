from __future__ import annotations
from typing import Dict, Any, List
from .base_agent import BaseAgent
from ..simulation.models import SolarProducerState

class SolarProducerAgent(BaseAgent):
    """
    Autonomous Solar Producer Agent:
    Aggregates community and rooftop solar generation, computes available surplus,
    and negotiates strategic ask bids in the P2P local energy market.
    """
    def __init__(self, memory, bus):
        super().__init__(name="SolarAgent", role="Solar Aggregator & Seller", memory=memory, bus=bus)

    def perceive_and_act(
        self,
        current_step: int,
        time_str: str,
        sim_state: Any,
        grid_status_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        sim = sim_state
        irradiance, weather = sim.calculate_solar_irradiance(current_step)

        # Calculate current generation across producers
        total_gen_kw = 0.0
        for p in sim.solar_producers:
            gen = p.capacity_kw * (irradiance / 1000.0)
            p.current_gen_kw = round(gen, 2)
            total_gen_kw += gen

        # Estimate local prosumer self-consumption
        load_mult = sim.calculate_household_base_profile(current_step)
        local_self_consumption_kw = 0.0
        for h in sim.households:
            if h.has_solar:
                local_self_consumption_kw += (h.base_load_kw + h.flexible_load_kw) * load_mult * 0.4

        surplus_kw = max(0.0, total_gen_kw - local_self_consumption_kw)

        # Strategic pricing decision:
        # Feed-in tariff from main grid is only 4.0 Rs/kWh.
        # Retail tariff is 13.5 Rs/kWh.
        # If grid is under stress, solar value is higher (e.g. 8.5 to 9.5 Rs/kWh).
        # In midday surplus with no stress, price discount to encourage local battery/EV charging (e.g. 6.5 to 7.5 Rs/kWh).
        grid_stressed = grid_status_data.get("stress_flag", False)

        if surplus_kw > 1.0:
            if grid_stressed:
                ask_price = 8.5
                reasoning = (
                    f"Surplus {surplus_kw:.1f} kW available during grid stress. Offering premium local energy "
                    f"at ₹{ask_price:.2f}/kWh (undercutting grid retail ₹13.50/kWh to aid grid stability)."
                )
            else:
                ask_price = 6.8
                reasoning = (
                    f"Abundant solar generation ({total_gen_kw:.1f} kW, {surplus_kw:.1f} kW surplus). "
                    f"Offering competitive ask at ₹{ask_price:.2f}/kWh to incentivize local battery absorption."
                )

            # Submit Ask to MarketAgent
            self.send_message(
                step=current_step,
                time_str=time_str,
                receiver="MarketAgent",
                message_type="P2P_ASK",
                priority="NORMAL",
                content=f"Solar Ask: {surplus_kw:.1f} kW @ ₹{ask_price:.2f}/kWh.",
                action_requested="REGISTER_ASK",
                reasoning=reasoning
            )
        else:
            ask_price = 0.0
            reasoning = f"Generation {total_gen_kw:.1f} kW consumed locally (Surplus: {surplus_kw:.1f} kW)."
            self.send_message(
                step=current_step,
                time_str=time_str,
                receiver="MarketAgent",
                message_type="SOLAR_TELEMETRY",
                priority="NORMAL",
                content=f"Solar generation {total_gen_kw:.1f} kW. Local self-consumption: 100%.",
                reasoning=reasoning
            )

        # Decision log
        self.log_decision(
            step=current_step,
            time_str=time_str,
            observation=f"Solar Generation {total_gen_kw:.1f} kW, Local Self-Consumption {local_self_consumption_kw:.1f} kW",
            decision=f"Offer {surplus_kw:.1f} kW @ ₹{ask_price:.2f}/kWh" if surplus_kw > 1.0 else "Hold (Self-Consumption)",
            reason=reasoning,
            state={
                "total_gen_kw": round(total_gen_kw, 2),
                "surplus_kw": round(surplus_kw, 2),
                "ask_price_kwh": ask_price
            },
            constraints=["min_feed_in_tariff=4.0", "max_retail_tariff=13.5"]
        )

        return {
            "total_gen_kw": round(total_gen_kw, 2),
            "surplus_kw": round(surplus_kw, 2),
            "ask_price_kwh": ask_price,
            "reasoning": reasoning
        }

SolarAgent = SolarProducerAgent
