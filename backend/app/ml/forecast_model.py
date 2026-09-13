from __future__ import annotations
import math
import numpy as np
from typing import Dict, Any, List, Tuple, Optional
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import r2_score, mean_absolute_error, root_mean_squared_error


class SyntheticMicrogridDataGenerator:
    @staticmethod
    def generate(num_days: int = 40, random_seed: int = 42) -> Dict[str, np.ndarray]:
        rng = np.random.default_rng(random_seed)
        total_steps = num_days * 96
        
        # Exact microgrid hardware capacities from scenarios.py
        solar_capacity_kw = 108.5  # 55kW Farm + 15kW Community + 38.5kW Rooftop
        nominal_household_kw = 60.5  # Sum of base (38.0) + flexible (22.5) across 7 facilities
        
        solar_gen = np.zeros(total_steps, dtype=np.float64)
        demand_load = np.zeros(total_steps, dtype=np.float64)
        irradiance_wm2 = np.zeros(total_steps, dtype=np.float64)
        temperature_c = np.zeros(total_steps, dtype=np.float64)
        steps_of_day = np.zeros(total_steps, dtype=np.int32)
        ev_scheduled = np.zeros(total_steps, dtype=np.float64)
        
        for day in range(num_days):
            spike_factor = rng.choice([1.0, 1.1, 1.2, 1.25])
            cloud_active = (day % 3 == 0)
            cloud_start = rng.integers(44, 55)
            cloud_end = cloud_start + rng.integers(10, 18)
            
            for s in range(96):
                idx = day * 96 + s
                steps_of_day[idx] = s
                hour = (s * 15.0) / 60.0
                
                temp = 25.0 + 8.0 * math.sin((hour - 8.0) / 24.0 * 2.0 * math.pi) + rng.normal(0, 0.5)
                temperature_c[idx] = round(temp, 2)
                
                # Diurnal solar irradiance
                if 24 <= s <= 76:
                    theta = math.pi * (s - 24) / 52.0
                    base_irr = math.sin(theta) * 950.0
                    cloud_mult = 0.15 if (cloud_active and cloud_start <= s <= cloud_end) else 1.0
                    irr = max(0.0, base_irr * cloud_mult + rng.normal(0, 4.0))
                else:
                    irr = 0.0
                
                irradiance_wm2[idx] = round(irr, 1)
                gen_kw = max(0.0, solar_capacity_kw * (irr / 1000.0))
                solar_gen[idx] = round(gen_kw, 2)
                
                # Household load curve
                if hour < 6.0:
                    mult = 0.35 + 0.05 * math.sin(hour)
                elif 6.0 <= hour < 9.0:
                    mult = 0.75 + 0.25 * math.sin((hour - 6.0) / 3.0 * math.pi)
                elif 9.0 <= hour < 17.0:
                    mult = 0.55 + 0.10 * math.sin((hour - 9.0) / 8.0 * math.pi)
                elif 17.0 <= hour < 22.0:
                    peak_intensity = math.sin((hour - 17.0) / 5.0 * math.pi)
                    mult = 1.0 + 0.35 * peak_intensity * spike_factor
                else:
                    mult = 0.65 - 0.25 * ((hour - 22.0) / 2.0)
                
                house = nominal_household_kw * mult + rng.normal(0, 0.5)
                
                # EV charging fleet schedule
                ev = 0.0
                if 68 <= s <= 86:
                    ev += 14.0  # Community van
                if 70 <= s <= 88:
                    ev += 7.2   # EV fleet 01
                if 72 <= s <= 92:
                    ev += 11.0  # EV fleet 02
                if 74 <= s <= 94:
                    ev += 7.2   # EV fleet 03
                
                ev_scheduled[idx] = ev
                tot_demand = max(10.0, house + ev)
                demand_load[idx] = round(tot_demand, 2)
                
        return {
            'steps_of_day': steps_of_day,
            'irradiance_wm2': irradiance_wm2,
            'solar_gen': solar_gen,
            'demand_load': demand_load,
            'temperature_c': temperature_c,
            'ev_scheduled': ev_scheduled
        }


class MLForecastEngine:
    _instance: Optional[MLForecastEngine] = None
    
    HORIZONS = [1, 2, 4]  # +15m, +30m, +60m
    HORIZON_NAMES = {1: '+15min', 2: '+30min', 4: '+60min'}

    def __init__(self, num_days: int = 40):
        self.is_trained = False
        self.solar_models: Dict[str, HistGradientBoostingRegressor] = {}
        self.demand_models: Dict[str, HistGradientBoostingRegressor] = {}
        self.residual_stds: Dict[str, Dict[str, float]] = {'solar': {}, 'demand': {}}
        self.metrics: Dict[str, Dict[str, float]] = {'solar': {}, 'demand': {}}
        self.feature_names = [
            'sin_target_step', 'cos_target_step', 'is_daylight_target', 'temperature_c',
            'solar_lag_0', 'solar_lag_1', 'solar_lag_2', 'solar_lag_4', 'solar_rolling_4',
            'demand_lag_0', 'demand_lag_1', 'demand_lag_2', 'demand_lag_4', 'demand_rolling_4',
            'scheduled_ev_kw'
        ]
        self._train_models(num_days=num_days)

    @classmethod
    def get_instance(cls) -> MLForecastEngine:
        if cls._instance is None:
            cls._instance = MLForecastEngine()
        return cls._instance

    def _train_models(self, num_days: int = 40):
        data = SyntheticMicrogridDataGenerator.generate(num_days=num_days, random_seed=42)
        total_len = len(data['solar_gen'])
        
        start_idx = 4
        end_idx = total_len - 4
        N = end_idx - start_idx
        split = int(N * 0.8)
        
        for h in self.HORIZONS:
            h_name = self.HORIZON_NAMES[h]
            X_h = np.zeros((N, len(self.feature_names)), dtype=np.float64)
            
            for i, idx in enumerate(range(start_idx, end_idx)):
                target_s = (data['steps_of_day'][idx] + h) % 96
                sin_t = math.sin(2.0 * math.pi * target_s / 96.0)
                cos_t = math.cos(2.0 * math.pi * target_s / 96.0)
                daylight_t = 1.0 if 24 <= target_s <= 76 else 0.0
                temp = data['temperature_c'][idx]
                
                s_lags = [
                    data['solar_gen'][idx],
                    data['solar_gen'][idx - 1],
                    data['solar_gen'][idx - 2],
                    data['solar_gen'][idx - 4],
                ]
                s_roll = float(np.mean(data['solar_gen'][idx - 4 : idx + 1]))
                
                d_lags = [
                    data['demand_load'][idx],
                    data['demand_load'][idx - 1],
                    data['demand_load'][idx - 2],
                    data['demand_load'][idx - 4],
                ]
                d_roll = float(np.mean(data['demand_load'][idx - 4 : idx + 1]))
                ev_target = data['ev_scheduled'][idx + h]
                
                X_h[i] = [
                    sin_t, cos_t, daylight_t, temp,
                    s_lags[0], s_lags[1], s_lags[2], s_lags[3], s_roll,
                    d_lags[0], d_lags[1], d_lags[2], d_lags[3], d_roll,
                    ev_target
                ]
                
            y_solar = data['solar_gen'][start_idx + h : end_idx + h]
            y_demand = data['demand_load'][start_idx + h : end_idx + h]
            
            X_train, X_val = X_h[:split], X_h[split:]
            y_solar_train, y_solar_val = y_solar[:split], y_solar[split:]
            y_demand_train, y_demand_val = y_demand[:split], y_demand[split:]
            
            # Fit Solar Regressor
            m_solar = HistGradientBoostingRegressor(
                max_iter=60, min_samples_leaf=15, learning_rate=0.08, random_state=42 + h
            )
            m_solar.fit(X_train, y_solar_train)
            preds_solar_val = m_solar.predict(X_val)
            res_solar = y_solar_val - preds_solar_val
            
            self.solar_models[h_name] = m_solar
            self.residual_stds['solar'][h_name] = max(0.5, float(np.std(res_solar)))
            self.metrics['solar'][h_name] = {
                'r2': round(float(r2_score(y_solar_val, preds_solar_val)), 3),
                'mae': round(float(mean_absolute_error(y_solar_val, preds_solar_val)), 2),
                'rmse': round(float(root_mean_squared_error(y_solar_val, preds_solar_val)), 2),
            }
            
            # Fit Demand Regressor
            m_demand = HistGradientBoostingRegressor(
                max_iter=60, min_samples_leaf=15, learning_rate=0.08, random_state=100 + h
            )
            m_demand.fit(X_train, y_demand_train)
            preds_demand_val = m_demand.predict(X_val)
            res_demand = y_demand_val - preds_demand_val
            
            self.demand_models[h_name] = m_demand
            self.residual_stds['demand'][h_name] = max(0.5, float(np.std(res_demand)))
            self.metrics['demand'][h_name] = {
                'r2': round(float(r2_score(y_demand_val, preds_demand_val)), 3),
                'mae': round(float(mean_absolute_error(y_demand_val, preds_demand_val)), 2),
                'rmse': round(float(root_mean_squared_error(y_demand_val, preds_demand_val)), 2),
            }
            
        self.is_trained = True

    def predict(self, sim: Any, current_step: int) -> Dict[str, Any]:
        if not self.is_trained:
            self._train_models()
            
        step_of_day = current_step % 96
        hour = (step_of_day * 15.0) / 60.0
        temp_c = 24.0 + 7.0 * math.sin((hour - 8.0) / 24.0 * 2.0 * math.pi)
        
        current_solar = sum(p.current_gen_kw for p in sim.solar_producers)
        load_mult = sim.calculate_household_base_profile(current_step)
        current_demand = sum(h.base_load_kw + h.flexible_load_kw for h in sim.households) * load_mult
        for ev in sim.evs:
            if ev.arrival_step <= current_step <= ev.deadline_step and ev.is_charging:
                current_demand += ev.charge_power_kw
                
        solar_history = [current_solar] * 5
        demand_history = [current_demand] * 5
        
        if hasattr(sim, 'history') and sim.history:
            for i, past in enumerate(reversed(sim.history[-4:])):
                solar_history[i + 1] = past.solar_total_kw
                demand_history[i + 1] = past.total_demand_kw
                
        solar_forecasts: Dict[str, float] = {}
        demand_forecasts: Dict[str, float] = {}
        deficit_forecasts: Dict[str, float] = {}
        confidence_bands: Dict[str, Dict[str, Dict[str, float]]] = {'solar': {}, 'demand': {}}
        
        solar_capacity = sum(p.capacity_kw for p in sim.solar_producers) or 108.5
        
        for h in self.HORIZONS:
            h_name = self.HORIZON_NAMES[h]
            target_step = (current_step + h) % 96
            
            sin_t = math.sin(2.0 * math.pi * target_step / 96.0)
            cos_t = math.cos(2.0 * math.pi * target_step / 96.0)
            daylight_t = 1.0 if 24 <= target_step <= 76 else 0.0
            
            ev_scheduled_kw = sum(
                ev.charge_power_kw for ev in sim.evs
                if ev.arrival_step <= (current_step + h) <= ev.deadline_step and ev.current_soc_pct < ev.target_soc_pct
            )
            
            row = np.array([[
                sin_t, cos_t, daylight_t, temp_c,
                solar_history[0], solar_history[1], solar_history[2], solar_history[4], float(np.mean(solar_history[:4])),
                demand_history[0], demand_history[1], demand_history[2], demand_history[4], float(np.mean(demand_history[:4])),
                ev_scheduled_kw
            ]], dtype=np.float64)
            
            # Predict Solar
            if target_step < 24 or target_step > 76:
                solar_pred = 0.0
                solar_std = 0.0
            else:
                raw_s = float(self.solar_models[h_name].predict(row)[0])
                solar_pred = max(0.0, min(solar_capacity, raw_s))
                solar_std = self.residual_stds['solar'][h_name]
                
            solar_forecasts[h_name] = round(solar_pred, 1)
            confidence_bands['solar'][h_name] = {
                'lower': round(max(0.0, solar_pred - 1.96 * solar_std), 1),
                'upper': round(min(solar_capacity, solar_pred + 1.96 * solar_std), 1),
                'std': round(solar_std, 2)
            }
            
            # Predict Demand
            raw_d = float(self.demand_models[h_name].predict(row)[0])
            demand_pred = max(5.0, raw_d)
            demand_std = self.residual_stds['demand'][h_name]
            
            demand_forecasts[h_name] = round(demand_pred, 1)
            confidence_bands['demand'][h_name] = {
                'lower': round(max(0.0, demand_pred - 1.96 * demand_std), 1),
                'upper': round(demand_pred + 1.96 * demand_std, 1),
                'std': round(demand_std, 2)
            }
            
            # Predict Deficit
            deficit_pred = max(0.0, demand_pred - solar_pred)
            deficit_forecasts[h_name] = round(deficit_pred, 1)
            
        return {
            'solar_forecasts': solar_forecasts,
            'demand_forecasts': demand_forecasts,
            'deficit_forecasts': deficit_forecasts,
            'confidence_bands': confidence_bands,
            'ml_metrics': self.metrics,
            'model_type': 'HistGradientBoostingRegressor (scikit-learn)',
            'features_used': self.feature_names
        }


ml_forecast_engine = MLForecastEngine.get_instance()
