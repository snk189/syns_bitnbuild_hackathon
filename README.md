# ⚡ GRIDMIND — Autonomous Multi-Agent Energy Management & P2P Energy Trading

> **A 24-Hour Hackathon MVP Microgrid Simulation Demonstrating True Agentic AI:**
> **Observation → Reasoning → Planning → Communication → Negotiation → Tool Use → Action → Feedback → Adaptation**

---

## 🌟 Overview

Modern decentralized energy systems contain competing stakeholders:
- **Solar Producers** wanting to maximize revenue.
- **Consumers** wanting lower electricity bills.
- **Central Batteries** safeguarding reserves and cycling life.
- **EV Fleets** requiring completed charging before morning departure.
- **Distribution Grids** protecting transformers from overload and blackout.

Traditional systems rely on centralized rules or dumb controllers. **GRIDMIND** replaces this with an autonomous multi-agent economic ecosystem where specialized agents communicate, negotiate peer-to-peer (P2P) energy trades, and mathematically optimize dispatch under physical electrical constraints.

---

## 🏗️ Architecture

```
                                 NEXT.JS 15 DASHBOARD
              (Topological Energy Flow • Multi-Agent Feed • P2P Ledger • Recharts)
                                          ▲
                                          │ WebSockets / REST API
                                          ▼
                                   FASTAPI BACKEND
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │                                   AGENT LAYER                                    │
 │  ForecastAgent │ GridHealthAgent │ SolarAgent │ BatteryAgent │ ConsumerAgent │ EV │
 │                                MarketAgent                                       │
 └────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │ Tool Calls / Decisions
 ┌────────────────────────────────────────▼─────────────────────────────────────────┐
 │                     DETERMINISTIC SAFETY & OPTIMIZER LAYER                       │
 │  • SciPy Linear Programming: Optimal peak shaving across Battery, EV, and Load    │
 │  • Safety Validator: Enforces SOC reserve (25%), inverter limits, EV deadlines   │
 └────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │ Validated Actions
 ┌────────────────────────────────────────▼─────────────────────────────────────────┐
 │                           MICROGRID PHYSICS ENGINE                               │
 │  • Exact Energy Conservation: Solar + Battery + Grid = Homes + EVs + Curtailment │
 │  • 24-Hour Scenarios (96 x 15-min intervals)                                     │
 │  • Twin Simulation Engine: Baseline (Mode A) vs GridMind (Mode B)                │
 └──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quickstart Guide

### Prerequisites
- Python 3.10+ (Tested on Python 3.13)
- Node.js 18+ (Tested on Node v24)
- npm 9+

### 1. Backend Setup & Startup
```bash
# Navigate to project root
cd bitnbuild

# Install dependencies (fastapi, uvicorn, pydantic, numpy, scipy, scikit-learn, websockets)
pip install -r backend/requirements.txt

# Launch FastAPI backend on port 8000
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

### 2. Frontend Setup & Startup
```bash
# In a new terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Next.js development server on port 3000
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 🧪 Automated Testing & Benchmark Verification

Run the entire test suite covering physics conservation, safety locks, linear programming dispatch, multi-agent orchestration, and API routes:

```bash
# Run all unit and integration tests
python -m unittest discover -s backend/tests -p "test_*.py" -v
```

Run the standalone CLI benchmark comparing Baseline vs GridMind:
```bash
python backend/run_scenario_comparison.py cloud_cover_peak
```

---

## 📊 Proven Simulation Results (Cloud Cover + Evening Peak)

All metrics are calculated directly from the deterministic microgrid physics simulator (no fabricated numbers):

| Metric | Mode A: Baseline | Mode B: GridMind | Improvement |
| :--- | :--- | :--- | :--- |
| **Peak Grid Demand** | 123.5 kW | **112.9 kW** | **-8.6%** Shaved |
| **Grid Overload Violations** | 6 Violations (>95% cap) | **0 Violations** | **100% Avoided (6)** |
| **Total Electricity Cost** | ₹8,439.1 | **₹7,475.8** | **-11.4% Savings** |
| **Total Grid Import** | 738.0 kWh | **674.4 kWh** | **-8.6%** |
| **P2P Energy Traded** | 0.0 kWh | **260.1 kWh** | **92 Bilateral Trades** |
| **Flexible Loads Shifted** | 0 events | **91 events** | **Automated Demand Response** |
| **Estimated CO₂ Emissions** | 605.2 kg | **553.0 kg** | **-8.6% Reduction** |

---

## 🤖 The Autonomous Agents

1. **Forecast Agent**: Uses scikit-learn multi-horizon regression models (+15m, +30m, +60m) to predict solar generation drops and residential consumption surges.
2. **Grid Health Agent**: Monitors transformer loading, voltage (pu), and frequency (Hz). Classifies state into `NORMAL`, `WARNING`, and `CRITICAL`.
3. **Solar Producer Agent**: Evaluates local self-consumption vs market tariffs and issues dynamic surplus sell bids to the P2P exchange.
4. **Central Battery Agent**: Guards the 25% emergency reserve floor, absorbs cheap midday solar surplus, and dispatches stored energy to shave transformer peaks.
5. **Consumer Agent**: Coordinates residential prosumers to shift non-critical loads (dryers, HVAC setbacks) while strictly protecting critical clinic and refrigeration loads.
6. **EV Fleet Agent**: Monitors EV arrival times and departure deadlines, deferring charging sessions only when adequate slack exists to guarantee 100% target SOC before departure.
7. **Market / Negotiation Agent**: Matches peer-to-peer buyers and sellers at negotiated mid-market rates (₹8.50/kWh vs Grid ₹13.50/kWh) and invokes the SciPy Linear Programming optimizer to allocate multi-resource dispatch.
