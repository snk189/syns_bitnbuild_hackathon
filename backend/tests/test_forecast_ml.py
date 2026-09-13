import unittest
import numpy as np
from backend.app.ml.forecast_model import (
    SyntheticMicrogridDataGenerator,
    MLForecastEngine,
    ml_forecast_engine
)
from backend.app.simulation.simulator import MicrogridSimulator
from backend.app.agents.forecast_agent import ForecastAgent
from backend.app.communication.message_bus import MessageBus
from backend.app.memory.memory import AgentMemory


class TestMLForecastingEngine(unittest.TestCase):
    def setUp(self):
        self.engine = ml_forecast_engine
        self.sim = MicrogridSimulator('cloud_cover_peak')
        self.bus = MessageBus()
        self.memory = AgentMemory(db_path=':memory:')
        self.agent = ForecastAgent(memory=self.memory, bus=self.bus)

    def test_synthetic_data_generation(self):
        data = SyntheticMicrogridDataGenerator.generate(num_days=5, random_seed=42)
        total_steps = 5 * 96
        self.assertEqual(len(data['solar_gen']), total_steps)
        self.assertEqual(len(data['demand_load']), total_steps)
        self.assertTrue(np.all(data['solar_gen'] >= 0.0))
        self.assertTrue(np.all(data['demand_load'] >= 5.0))
        # Nighttime solar irradiance must be zero
        night_steps = [s for s in range(total_steps) if s % 96 < 24 or s % 96 > 76]
        self.assertTrue(np.all(data['solar_gen'][night_steps] == 0.0))

    def test_ml_models_accuracy_benchmarks(self):
        self.assertTrue(self.engine.is_trained)
        for h in ['+15min', '+30min', '+60min']:
            solar_r2 = self.engine.metrics['solar'][h]['r2']
            demand_r2 = self.engine.metrics['demand'][h]['r2']
            solar_mae = self.engine.metrics['solar'][h]['mae']
            demand_mae = self.engine.metrics['demand'][h]['mae']

            self.assertGreaterEqual(solar_r2, 0.85, f'Solar R2 for {h} below 0.85: {solar_r2}')
            self.assertGreaterEqual(demand_r2, 0.90, f'Demand R2 for {h} below 0.90: {demand_r2}')
            self.assertLessEqual(solar_mae, 6.0, f'Solar MAE for {h} above 6.0 kW: {solar_mae}')
            self.assertLessEqual(demand_mae, 5.0, f'Demand MAE for {h} above 5.0 kW: {demand_mae}')

    def test_prediction_horizons_and_non_negativity(self):
        test_steps = [10, 32, 50, 72, 85]
        for step in test_steps:
            res = self.engine.predict(self.sim, step)
            for h in ['+15min', '+30min', '+60min']:
                s_pred = res['solar_forecasts'][h]
                d_pred = res['demand_forecasts'][h]
                def_pred = res['deficit_forecasts'][h]

                self.assertGreaterEqual(s_pred, 0.0)
                self.assertGreaterEqual(d_pred, 5.0)
                self.assertGreaterEqual(def_pred, 0.0)

                # Confidence bands check
                s_band = res['confidence_bands']['solar'][h]
                d_band = res['confidence_bands']['demand'][h]
                self.assertLessEqual(s_band['lower'], s_pred + 0.01)
                self.assertGreaterEqual(s_band['upper'], s_pred - 0.01)
                self.assertLessEqual(d_band['lower'], d_pred + 0.01)
                self.assertGreaterEqual(d_band['upper'], d_pred - 0.01)

    def test_nighttime_solar_strictly_zero(self):
        # Step 8 (02:00 at night)
        res = self.engine.predict(self.sim, 8)
        for h in ['+15min', '+30min', '+60min']:
            self.assertEqual(res['solar_forecasts'][h], 0.0)
            self.assertEqual(res['confidence_bands']['solar'][h]['std'], 0.0)

    def test_forecast_agent_perceive_and_act(self):
        res = self.agent.perceive_and_act(50, '12:30', self.sim)
        self.assertIn('solar_forecasts', res)
        self.assertIn('demand_forecasts', res)
        self.assertIn('deficit_forecasts', res)
        self.assertIn('confidence_bands', res)
        self.assertIn('ml_metrics', res)
        self.assertEqual(res['model_type'], 'HistGradientBoostingRegressor (scikit-learn)')

        # Verify audit log in memory
        recent_logs = self.memory.get_recent_decisions(limit=1)
        self.assertEqual(len(recent_logs), 1)
        self.assertEqual(recent_logs[0]['agent'], 'ForecastAgent')
        self.assertIn('ml_metrics', recent_logs[0]['state'])


if __name__ == '__main__':
    unittest.main()
