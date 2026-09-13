# ⚡ GRIDMIND — Autonomous Multi-Agent Energy Management & P2P Energy Trading

> **A 24-Hour Autonomous Microgrid Simulation Demonstrating True Agentic AI:**  
> **Observation → Reasoning → Planning → Communication → Negotiation → Tool Use → Action → Feedback → Adaptation**

---

## 🌟 Overview

Modern decentralized energy systems contain competing stakeholders:
- **Solar Producers** wanting to maximize revenue.
- **Consumers** wanting lower electricity bills.
- **Central Batteries** safeguarding reserves and cycling life.
- **EV Fleets** requiring completed charging before morning departure.
- **Distribution Grids** protecting transformers from overload and blackout.

Traditional systems rely on centralized rules or rigid controllers. **GRIDMIND** replaces this with an autonomous multi-agent economic ecosystem where specialized agents communicate, negotiate peer-to-peer (P2P) energy trades, and mathematically optimize dispatch under physical electrical constraints in real-time.

---

## 🎭 Dual Interaction Model & Experience Modes

GRIDMIND provides a **demo-mode role separation** right from the welcome screen:

```
                  [ Welcome to GridMind ]
                     [ Enter Your Name ]
                              │
            ┌─────────────────┴─────────────────┐
            ▼                                   ▼
          admin                             "Rahul" (Any Prosumer)
            │                                   │
┌───────────────────────┐           ┌───────────────────────┐
│ ADMIN CONTROL CENTER  │           │  P2P ENERGY TRADING   │
├───────────────────────┤           ├───────────────────────┤
│ • 1. Dashboard        │           │ • 1. My Energy        │
│ • 2. Live Simulation  │           │ • 2. Market Offers    │
│ • 3. Agent Decisions  │           │ • 3. Buy Energy Form  │
│ • 4. Energy Sources   │           │ • 4. Sell Energy Form │
│ • 5. Scenarios        │           │ • 5. My Trades Ledger │
│ • 6. Analytics        │           │                       │
└───────────────────────┘           └───────────────────────┘
```

1. **Admin Mode (`admin`)**:
   - **Dashboard**: High-level telemetry, **Current GridMind Decision** hero card, and live plain-English **"Why Did GridMind Decide This?"** rationale.
   - **Live Simulation**: Interactive animated topological power-flow diagram, playback scrubber, and live agent communication feed.
   - **Agent Decisions**: 96-step timeline scrubber inspecting genuine decisions, actions, and real rationale from all 7 backend agents.
   - **Energy Sources**: Interactive microgrid tuning panel with real-time cause-and-effect recalculation engine (`POST /api/simulation/override`).
   - **Scenarios**: Stress testing across all 6 operating scenarios with 1-click activation and Baseline vs GridMind comparison.
   - **Analytics**: Deep-dive cost reduction %, CO₂ abated, renewable self-sufficiency %, and IEEE 1547 safety compliance checks.

2. **Normal User Mode (e.g. `Rahul`)**:
   - Clean, prosumer-facing marketplace without internal simulation controls.
   - Real-time **My Energy** balance (consumption, solar PV, battery reserve).
   - **Marketplace Order Book** with 1-click order matching.
   - Intuitive **Buy Orders** and **Sell Offers**.
   - Immutable **My Trades** ledger tracking volume (kWh), clearing rates (₹/kWh), and cost savings.

---

## 🏗️ Architecture

```
                                 NEXT.JS 16 DASHBOARD
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
 │  • Safety Validator: Enforces SOC reserve (12-25%), inverter limits, EV slack    │
 └────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │ Validated Actions
 ┌────────────────────────────────────────▼─────────────────────────────────────────┐
 │                           MICROGRID PHYSICS ENGINE                               │
 │  • Exact Energy Conservation: Solar + Battery + Grid = Homes + EVs + Curtailment │
 │  • 24-Hour Scenarios (96 x 15-min intervals)                                     │
 │  • Real-Time Recalculation Engine: Instant re-dispatch upon energy input changes │
 │  • Twin Simulation Engine: Baseline (Mode A) vs GridMind (Mode B)                │
 └──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quickstart Guide

### Prerequisites
- **Python 3.10+** (Tested on Python 3.11 – 3.13)
- **Node.js 18+** (Tested on Node v20 & v24)
- **npm 9+**

### 1. Backend Setup & Startup
Open a terminal in the project root directory:

```powershell
# Install backend dependencies
pip install -r backend/requirements.txt

# Launch FastAPI backend on port 8000
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

> **API Health Check**: Verify at [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)  
> **Interactive Swagger Docs**: View at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 2. Frontend Setup & Startup
Open a second terminal window:

```powershell
# Navigate to frontend directory
cd frontend

# Install frontend dependencies
npm install

# Start Next.js development server
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🎮 Live Demonstration Flow

1. **Open App**: Access [http://localhost:3000](http://localhost:3000).
2. **Login as Admin**: Type `admin` and click **Continue**.
3. **Select Scenario 3**: Choose **Scenario 3 — Cloud Cover + Evening Peak** and click **START**.
4. **Inspect High-Level Decision**: Observe the **Current GridMind Decision** hero card and the **Why Did GridMind Decide This?** section.
5. **Inspect Agents (Tab 3)**: Jump to **Agent Decisions** and scrub through timesteps to inspect real decision reasoning from all 7 backend agents.
6. **Tune Microgrid (Tab 4)**: Open **Energy Sources**, drop Solar to `5 kW` using the quick adjustment button, and watch the real-time cause-and-effect recalculation update the decision.
7. **Switch to Normal User**: Click **Logout** in the top right, enter `Rahul`, and view the clean **P2P Energy Marketplace**.
8. **Execute Trade**: Place a buy order or match directly from the order book and observe the executed trade appear in **My Trades**.

---

## 🧪 Automated Testing & Benchmark Verification

Run the entire test suite covering physics conservation, safety locks, linear programming dispatch, multi-agent orchestration, and override APIs:

```powershell
# Run all 24 unit and integration tests
python -m unittest discover -s backend/tests -p "test_*.py" -v
```

Run the standalone CLI benchmark comparing Baseline vs GridMind:
```powershell
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

1. **Forecast Agent**: Uses a production-grade machine learning engine (`HistGradientBoostingRegressor`) trained on multi-day synthetic data to predict solar generation drops and residential consumption surges across +15m, +30m, and +60m horizons. It utilizes multi-lag feature engineering and computes calibrated 95% confidence intervals ($\pm 1.96\sigma$) to provide uncertainty quantification.
2. **Grid Health Agent**: Monitors transformer loading, voltage (pu), and frequency (Hz). Classifies state into `NORMAL`, `WARNING`, and `CRITICAL`.
3. **Solar Producer Agent**: Evaluates local self-consumption vs market tariffs and issues dynamic surplus sell bids to the P2P exchange.
4. **Central Battery Agent**: Guards reserve limits, absorbs cheap midday solar surplus, and dispatches stored energy to shave transformer peaks.
5. **Consumer Agent**: Coordinates residential prosumers to shift non-critical loads (dryers, HVAC setbacks) while strictly protecting critical clinic and refrigeration loads.
6. **EV Fleet Agent**: Monitors EV arrival times and departure deadlines, deferring charging sessions only when adequate slack exists to guarantee 100% target SOC before departure.
7. **Market / Negotiation Agent**: Matches peer-to-peer buyers and sellers at negotiated mid-market rates (₹8.50/kWh vs Grid ₹13.50/kWh) and invokes the SciPy Linear Programming optimizer to allocate multi-resource dispatch.
