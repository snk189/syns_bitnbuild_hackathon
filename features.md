Absolutely. Since you're moving into **Antigravity IDE** and want it to understand the entire GridMind project from the beginning, the best approach is to give it one **master engineering prompt** that defines the problem, architecture, agents, simulation, testing, debugging, constraints, and development workflow.

You can paste the following **entire prompt as one message** into Antigravity:

```text
You are the lead software architect, AI engineer, backend engineer, simulation engineer, and debugging engineer for this project.

We are building a hackathon project called:

GRIDMIND — Autonomous Multi-Agent Energy Management & P2P Energy Trading

IMPORTANT:
This is a 24-hour hackathon MVP. The goal is not to build a production electricity grid system. The goal is to create a highly convincing, functional simulation that demonstrates TRUE AGENTIC AI behavior: observation → reasoning → planning → communication → negotiation → tool use → action → feedback → adaptation.

The project must be runnable locally and must include a realistic microgrid simulation so we can repeatedly test scenarios without requiring physical hardware or a real electricity grid.

==================================================
1. CORE PROBLEM
==================================================

Modern decentralized energy systems contain multiple stakeholders:

- Solar producers
- Households/consumers
- Battery storage systems
- EVs
- The main electricity grid
- Local energy markets

Their objectives conflict.

For example:

- Consumers want the lowest electricity price.
- Solar producers want to maximize revenue.
- Battery owners want to minimize degradation and preserve reserve energy.
- EV owners want their vehicles charged before deadlines.
- The grid wants to prevent overload and instability.
- The market wants efficient allocation of available energy.

Traditional systems often use centralized optimization or fixed rules.

GRIDMIND instead models these stakeholders as autonomous AI agents that communicate and coordinate with each other.

The key idea:

"Turn a microgrid into a multi-agent economic ecosystem instead of controlling it through one centralized intelligence."

The system should NOT merely predict electricity demand.

It must predict, reason, negotiate, plan, and execute actions.

==================================================
2. PRIMARY HACKATHON OBJECTIVE
==================================================

Build a working web application demonstrating:

1. Energy demand forecasting
2. Solar generation forecasting
3. Grid stress prediction
4. Multiple autonomous agents
5. Agent-to-agent communication
6. P2P energy negotiation
7. Battery scheduling
8. EV/load shifting
9. Autonomous energy allocation
10. Microgrid simulation
11. Safety/constraint enforcement
12. Before-vs-after performance comparison
13. Live visualization of agent decisions
14. Repeatable crisis scenarios
15. Logs explaining why agents made decisions

The final demo should clearly show:

NORMAL GRID
        ↓
EVENING PEAK + CLOUD COVER
        ↓
FORECAST AGENT PREDICTS PROBLEM
        ↓
GRID AGENT DETECTS FUTURE STRESS
        ↓
AGENTS COMMUNICATE
        ↓
MARKET NEGOTIATION
        ↓
SOLAR + BATTERY + FLEXIBLE LOADS COORDINATED
        ↓
GRID STRESS REDUCED
        ↓
COMPARE BASELINE VS GRIDMIND
        ↓
SHOW ACTUAL METRICS

==================================================
3. IMPORTANT ARCHITECTURAL PRINCIPLE
==================================================

DO NOT build this as:

"LLM chatbot + dashboard + hardcoded energy values."

It must behave like an actual agentic system.

Use the LLM/agent layer for:

- reasoning
- planning
- interpreting state
- deciding what information/tools are needed
- communication
- negotiation
- explaining decisions
- adapting based on results

Use deterministic software for:

- physical simulation
- mathematical calculations
- electrical constraints
- battery SOC calculations
- energy balance
- optimization
- price calculations
- safety validation
- executing simulated actions

NEVER allow an LLM to directly violate physical or operational constraints.

Architecture should follow:

Agent
   ↓
Reasoning / Planning
   ↓
Tool call
   ↓
Deterministic validation
   ↓
Optimizer / Safety layer
   ↓
Simulation
   ↓
Result
   ↓
Agent observes result
   ↓
Next decision

==================================================
4. AGENTS
==================================================

Implement the following agents.

------------------------------------------
AGENT 1 — FORECAST AGENT
------------------------------------------

Responsibilities:

- Predict future electricity demand.
- Predict future solar generation.
- Analyze weather-related effects.
- Identify upcoming supply-demand imbalance.
- Provide forecasts for 15, 30 and 60 minute horizons.

Inputs:

- Historical demand
- Historical solar generation
- Weather data
- Current generation
- Current consumption
- Time of day
- Day type

Outputs:

Example:

Current demand: 62 kW
15 min: 70 kW
30 min: 84 kW
60 min: 91 kW

Current solar: 75 kW
15 min: 61 kW
30 min: 48 kW
60 min: 30 kW

Reasoning example:

"Solar generation is expected to decline while residential demand is increasing. A supply deficit is likely within approximately 25 minutes."

For the MVP, synthetic/historical data and scikit-learn models are acceptable.

Do NOT spend excessive time building a sophisticated deep-learning forecasting model.

Reliability and integration are more important.

------------------------------------------
AGENT 2 — GRID HEALTH AGENT
------------------------------------------

Responsibilities:

Monitor:

- Total load
- Total generation
- Grid import/export
- Transformer loading
- Voltage
- Current
- Frequency
- Predicted overload
- Supply-demand imbalance

Classify:

NORMAL
WARNING
CRITICAL

It should detect both:

CURRENT problems

and

PREDICTED future problems.

Example:

"Current grid load is 78 kW. Forecast indicates 96 kW within 20 minutes. Transformer utilization may exceed safe threshold."

The agent should be able to notify other agents.

------------------------------------------
AGENT 3 — SOLAR PRODUCER AGENT
------------------------------------------

Represents a solar producer.

State:

- Current generation
- Forecast generation
- Local consumption
- Surplus energy
- Minimum acceptable selling price
- Maximum available energy

Example:

Generation = 8 kW
Consumption = 3 kW
Surplus = 5 kW

The agent can offer surplus energy to the local market.

It should consider:

- Current price
- Expected future price
- Expected future solar generation
- Local demand
- Grid condition

Do NOT use a simplistic:

"if surplus > 0 then sell."

It should have reasoning.

------------------------------------------
AGENT 4 — BATTERY AGENT
------------------------------------------

State:

- Current SOC
- Battery capacity
- Maximum charge power
- Maximum discharge power
- Minimum reserve SOC
- Battery health
- Current energy price
- Forecast demand
- Forecast solar

Responsibilities:

- Charge when appropriate.
- Discharge when appropriate.
- Preserve reserve.
- Avoid unnecessary cycling.
- Consider future demand and price.

Example reasoning:

"Battery SOC is 72%. Forecast indicates a demand spike in 30 minutes. Current price is moderate. Preserve 30% reserve and discharge only if grid stress becomes critical."

------------------------------------------
AGENT 5 — CONSUMER / EV AGENTS
------------------------------------------

Create multiple consumer agents.

Each household can have:

- Current load
- Base load
- Flexible load
- Maximum acceptable electricity price
- Critical loads
- Non-critical loads

EV agents have:

- Battery capacity
- Current SOC
- Target SOC
- Charging power
- Required completion time
- Maximum acceptable price
- Flexible charging window

Example:

"EV requires 18 kWh before 08:00. Grid is currently stressed. Delay charging by 30 minutes because the deadline allows flexibility."

The system should support multiple independent consumers/EVs.

------------------------------------------
AGENT 6 — MARKET / NEGOTIATION AGENT
------------------------------------------

This is one of the most important agents.

Responsibilities:

- Discover buyers.
- Discover sellers.
- Match supply and demand.
- Negotiate prices.
- Coordinate battery participation.
- Consider grid constraints.
- Execute simulated trades.

Example:

Solar seller:

"Offer 3 kWh at minimum ₹7/kWh."

Buyer:

"Willing to pay up to ₹10/kWh."

Grid price:

"₹13/kWh."

Market agent negotiates:

"Execute P2P trade at ₹8.50/kWh."

The market agent should not simply use a fixed hardcoded price.

Price should depend on:

- Supply
- Demand
- Grid price
- Seller minimum price
- Buyer maximum price
- Grid stress
- Time
- Availability

==================================================
5. MICROGRID SIMULATOR
==================================================

THIS IS ESSENTIAL.

Build a deterministic microgrid simulation engine.

We need to be able to run the entire GridMind system without physical hardware.

The simulator should represent:

- Main grid
- Transformer
- Solar plants
- Houses
- EVs
- Batteries
- Local P2P market
- Weather
- Time progression

Use simulated time steps, preferably 5-minute or 15-minute intervals.

Example:

00:00
00:15
00:30
...
23:45

At each timestep calculate:

Solar generation
+
Battery discharge
+
Grid import
=
Household demand
+
EV charging
+
Battery charging
+
Other loads

Maintain energy balance.

The simulator should expose APIs/tools such as:

get_grid_state()
get_solar_state()
get_household_state()
get_battery_state()
get_ev_state()
get_weather()
advance_simulation()
apply_battery_action()
apply_ev_schedule()
apply_load_shift()
execute_p2p_trade()

Every simulation action must update the simulated state.

==================================================
6. SIMULATION SCENARIOS
==================================================

Implement multiple predefined scenarios.

At minimum:

------------------------------------------
SCENARIO 1 — NORMAL DAY
------------------------------------------

Moderate demand.
Normal solar generation.
No major grid stress.

Purpose:
Show normal operation.

------------------------------------------
SCENARIO 2 — EVENING PEAK
------------------------------------------

Solar decreases.
Household demand increases.
EV charging increases.

Purpose:
Demonstrate load management.

------------------------------------------
SCENARIO 3 — CLOUD COVER + EVENING PEAK
------------------------------------------

Sudden reduction in solar generation.

At the same time:

- Household demand rises.
- EV charging increases.
- Battery SOC starts falling.

This should create a potential grid overload.

THIS SHOULD BE THE MAIN DEMO SCENARIO.

------------------------------------------
SCENARIO 4 — SOLAR SURPLUS
------------------------------------------

Solar generation becomes much higher than local consumption.

Demonstrate:

- P2P trading
- Battery charging
- Reduced grid export
- Renewable utilization

------------------------------------------
SCENARIO 5 — BATTERY LOW SOC
------------------------------------------

Battery is near reserve threshold.

Demonstrate that the Battery Agent refuses unsafe discharge and coordinates other resources instead.

------------------------------------------
SCENARIO 6 — GRID EMERGENCY
------------------------------------------

Grid becomes critically overloaded.

The system should enter EMERGENCY MODE.

Priority:

1. Grid stability
2. Critical loads
3. Battery safety
4. Renewable utilization
5. Cost optimization
6. Non-critical flexible loads

==================================================
7. BASELINE VS GRIDMIND
==================================================

This is extremely important for the judging criteria.

The simulator must support two modes:

MODE A — BASELINE

No intelligent multi-agent coordination.

Use simple conventional rules.

For example:

- EV charges immediately.
- Battery follows basic threshold rule.
- Solar surplus is exported.
- No P2P negotiation.
- No coordinated load shifting.

MODE B — GRIDMIND

Use the autonomous multi-agent system.

Then run exactly the same scenario.

Compare:

- Peak demand
- Grid import
- Energy cost
- Solar curtailment
- Renewable utilization
- Battery utilization
- P2P energy traded
- Estimated CO2 emissions
- Number of grid violations
- Number of flexible loads shifted

The system must calculate these metrics from actual simulation results.

DO NOT fabricate improvement percentages.

==================================================
8. AGENTIC MEMORY
==================================================

Agents should have memory.

At minimum implement short-term and historical memory.

Examples:

House 12:

"Typical evening demand: 4.2 kW."

EV 4:

"Usually charges between 19:00 and 21:00."

Battery:

"Previous cycle ended at 35% SOC."

Solar producer:

"Usually has 5–7 kW surplus between 11:00 and 14:00."

Memory can initially be implemented using SQLite or structured JSON/database storage.

Do not over-engineer vector databases unless necessary.

==================================================
9. AGENT COMMUNICATION
==================================================

Agents must communicate through a clear message/event system.

Create a standardized message format containing:

- sender
- receiver
- timestamp
- message type
- priority
- state/context
- requested action
- response
- reasoning

Example:

GRID_AGENT → MARKET_AGENT

"Grid stress predicted in 20 minutes.
Expected load: 94 kW.
Available flexibility required: 12 kW."

MARKET_AGENT → BATTERY_AGENT

"Can you provide 5 kW for the next 15 minutes while maintaining reserve?"

BATTERY_AGENT → MARKET_AGENT

"Can provide 4 kW. Current SOC 68%. Minimum reserve 30%."

The dashboard must be able to visualize these messages.

==================================================
10. TOOL SYSTEM
==================================================

Agents should use actual callable tools.

Implement a tool registry.

Example tools:

Forecast tools:
- get_weather()
- get_energy_history()
- predict_demand()
- predict_solar()

Grid tools:
- get_grid_state()
- calculate_peak_risk()
- simulate_load()
- check_grid_constraints()

Battery tools:
- get_battery_state()
- simulate_charge()
- simulate_discharge()
- calculate_reserve()

Market tools:
- get_buyers()
- get_sellers()
- calculate_price()
- execute_trade()

Consumer tools:
- get_consumption()
- get_flexible_loads()
- schedule_ev()

Simulation tools:
- get_simulation_state()
- advance_simulation()
- trigger_scenario()
- reset_simulation()

The agents should actually call these tools rather than pretending they called them.

==================================================
11. OPTIMIZATION ENGINE
==================================================

Use deterministic optimization where appropriate.

Prefer OR-Tools or another lightweight optimization library.

Possible objectives:

Minimize:

energy cost
+
grid peak
+
load shedding
+
battery degradation

while maximizing:

renewable utilization
+
P2P trading

Subject to:

- Battery SOC limits
- Battery power limits
- EV charging limits
- EV deadlines
- Grid capacity
- Critical load constraints
- Energy balance

IMPORTANT:

The LLM/agent should decide WHAT needs to happen.

The optimizer should determine a mathematically valid allocation.

Example:

Agent:

"We need to reduce grid demand by 10 kW."

Optimizer:

Battery: -4 kW
EV 1 delay: -3 kW
EV 2 delay: -2 kW
Flexible household load: -1 kW

Total reduction = 10 kW

==================================================
12. SAFETY LAYER
==================================================

Create a deterministic safety validator between agents and simulator.

No agent action should directly modify the physical state.

Flow:

Agent Decision
      ↓
Safety Validator
      ↓
Optimizer / Constraint Checker
      ↓
Simulator
      ↓
Updated State

Reject actions that violate:

- Battery SOC
- Maximum charge/discharge
- EV limits
- Grid capacity
- Critical load constraints
- Energy conservation

Return a clear reason when an action is rejected.

==================================================
13. BACKEND
==================================================

Use:

Python
FastAPI

Backend responsibilities:

- Agent orchestration
- Simulation
- Agent communication
- Forecasting
- Optimization
- Database
- API endpoints
- WebSocket/live events

Create clean modular folders.

Suggested structure:

backend/
    app/
        main.py
        agents/
            base_agent.py
            forecast_agent.py
            grid_agent.py
            solar_agent.py
            battery_agent.py
            consumer_agent.py
            ev_agent.py
            market_agent.py
        simulation/
            simulator.py
            scenarios.py
            models.py
        tools/
            forecast_tools.py
            grid_tools.py
            battery_tools.py
            market_tools.py
            consumer_tools.py
            simulation_tools.py
        optimization/
            optimizer.py
        safety/
            validator.py
        memory/
            memory.py
        communication/
            message_bus.py
        api/
            routes.py
        database/
            database.py
        tests/

Modify the structure if you find a better clean architecture, but keep responsibilities separated.

==================================================
14. FRONTEND
==================================================

Use:

Next.js
TypeScript
Tailwind CSS
Recharts or another lightweight charting library

Create a professional hackathon dashboard.

Main dashboard should display:

------------------------------------------
GRID STATUS
------------------------------------------

NORMAL / WARNING / CRITICAL

------------------------------------------
LIVE ENERGY FLOW
------------------------------------------

Solar → Local Consumers
Solar → Battery
Solar → P2P Market
Battery → Consumers
Grid → Consumers

Show arrows/flows where possible.

------------------------------------------
KEY METRICS
------------------------------------------

Current demand
Solar generation
Battery SOC
Grid import
Grid load
Electricity price
P2P price
Renewable utilization

------------------------------------------
AGENT ACTIVITY
------------------------------------------

Live feed:

Forecast Agent:
"Solar generation expected to fall 38%."

Grid Agent:
"Overload risk detected in 20 minutes."

Market Agent:
"Searching for local sellers."

Solar Agent:
"Offering 4.2 kWh surplus."

Battery Agent:
"Available discharge: 3.5 kW."

EV Agent:
"Charging delayed by 30 minutes."

------------------------------------------
P2P MARKET
------------------------------------------

Show:

Seller
Buyer
Energy
Price
Status

------------------------------------------
BASELINE VS GRIDMIND
------------------------------------------

Show charts for:

Peak load
Grid import
Cost
Renewable utilization
P2P energy
CO2

==================================================
15. LIVE SIMULATION CONTROL
==================================================

Dashboard must contain:

START
PAUSE
RESET
STEP
SPEED

Scenario selector:

Normal Day
Evening Peak
Cloud Cover
Solar Surplus
Battery Low
Grid Emergency

Also allow:

"Trigger Crisis"

button.

When clicked, the simulator should introduce:

- solar reduction
- demand spike
- EV charging spike

and allow us to observe the agents responding.

==================================================
16. EVENT TIMELINE
==================================================

Create an event timeline.

Example:

19:00 — Normal operation
19:10 — Forecast Agent predicts solar decline
19:15 — Grid Agent detects future overload
19:15 — Market Agent starts negotiation
19:16 — Solar Agent offers 3.2 kWh
19:16 — Battery Agent offers 4 kW
19:17 — EV Agent delays charging
19:18 — P2P trade executed
19:20 — Grid stress reduced

This will be extremely important during the hackathon demo.

==================================================
17. TECH STACK
==================================================

Backend:

Python
FastAPI
Pydantic
NumPy
Pandas
scikit-learn
OR-Tools
SQLite initially

Frontend:

Next.js
TypeScript
Tailwind CSS
Recharts
WebSockets

Agent layer:

Use an appropriate agent orchestration approach.

You may use an established framework if it genuinely improves implementation speed.

Otherwise implement a lightweight custom multi-agent orchestrator.

Do NOT add unnecessary dependencies.

LLM provider should be configurable through environment variables.

Never hardcode API keys.

Use:

.env

and provide:

.env.example

==================================================
18. DATA
==================================================

The project must work without external APIs.

Create synthetic datasets for:

- Household demand
- Solar generation
- Weather
- EV usage
- Battery SOC
- Electricity prices

The simulator must always work offline.

Optional external weather APIs may be added later as a stretch feature.

Do not make the entire application dependent on external APIs.

==================================================
19. TESTING STRATEGY
==================================================

TESTING IS NOT AN END-OF-PROJECT TASK.

After implementing EVERY major module:

1. Build
2. Run tests
3. Run the relevant simulation
4. Inspect logs
5. Fix errors
6. Re-run
7. Only then continue

Use frequent checkpoints.

Minimum tests:

Unit tests:

- Energy balance
- Battery SOC
- Battery constraints
- EV constraints
- Grid overload detection
- Forecast output
- Market price calculation
- P2P trade validation
- Optimizer constraints
- Safety validator

Integration tests:

- Forecast → Grid Agent
- Grid Agent → Market Agent
- Market → Battery
- Market → EV
- Agent action → Safety layer → Simulator

Scenario tests:

- Normal day
- Evening peak
- Cloud cover
- Solar surplus
- Battery low
- Grid emergency

End-to-end test:

Run an entire simulated day with GridMind.

Then run the exact same day using baseline mode.

Generate comparison metrics.

==================================================
20. BUILD / TEST / DEBUG LOOP
==================================================

Follow this workflow continuously.

DO NOT write the entire project blindly and only test at the end.

Use:

IMPLEMENT
↓
BUILD
↓
TEST
↓
RUN
↓
INSPECT
↓
DEBUG
↓
TEST AGAIN
↓
CONTINUE

After each major milestone, verify that the existing functionality still works.

Major milestones:

Milestone 1:
Project setup + backend + frontend

Milestone 2:
Microgrid simulator

Milestone 3:
Baseline simulation

Milestone 4:
Forecast Agent

Milestone 5:
Grid Agent

Milestone 6:
Solar/Battery/Consumer/EV Agents

Milestone 7:
Market Agent + negotiation

Milestone 8:
Agent communication

Milestone 9:
Optimization + safety layer

Milestone 10:
Frontend dashboard

Milestone 11:
Baseline vs GridMind

Milestone 12:
End-to-end crisis demo

At each milestone:

- Build the relevant code.
- Run automated tests.
- Run at least one realistic simulation.
- Check logs.
- Fix errors before moving forward.
- Do not leave known errors unresolved.

==================================================
21. DEBUGGING REQUIREMENTS
==================================================

When something fails:

1. Identify the actual root cause.
2. Reproduce the problem.
3. Fix the smallest appropriate component.
4. Run the failing test again.
5. Run related tests.
6. Run the simulation again.
7. Verify that the fix did not break other components.

Do not hide errors.

Do not silently catch exceptions.

Use structured logging.

Agent logs should contain:

timestamp
agent
event
decision
reason
tool used
result
status

==================================================
22. CODE QUALITY
==================================================

Follow these principles:

- Small functions
- Clear naming
- Strong typing where possible
- Modular architecture
- No unnecessary abstractions
- No giant files
- No duplicated business logic
- No hardcoded secrets
- No hardcoded fake "AI" outputs
- No unnecessary dependencies
- Meaningful error handling
- Tests for important logic

Prefer maintainable code over clever code.

==================================================
23. AGENT DECISION LOGGING
==================================================

Every major autonomous decision should be explainable.

Example:

{
  "agent": "BatteryAgent",
  "observation": "Grid overload predicted in 20 minutes",
  "state": {
      "soc": 72,
      "price": 9.2,
      "forecast_demand": 91
  },
  "decision": "Offer 4 kW discharge",
  "reason": "SOC is sufficiently high and predicted demand spike exceeds available solar",
  "constraints": [
      "minimum_soc=30",
      "max_discharge=5kW"
  ]
}

The dashboard should expose these decisions in human-readable form.

==================================================
24. EMERGENCY MODE
==================================================

Implement an explicit emergency mode.

Normal mode objective:

- Minimize cost
- Maximize renewable utilization
- Maximize P2P trading
- Minimize grid import

Emergency mode objective:

1. Prevent grid violation
2. Protect critical loads
3. Respect battery safety
4. Reduce non-critical demand
5. Use local renewable energy
6. Optimize remaining cost

This should demonstrate that agents can change priorities based on context.

==================================================
25. DEMO SCENARIO
==================================================

The final demo should be reproducible.

Start:

Time = 18:30

Solar = high but declining
Demand = moderate
Battery SOC = 75%
EV charging = moderate
Grid = NORMAL

Then trigger:

"Cloud Cover + Evening Peak"

Over the next simulation steps:

Solar decreases sharply.
Household demand increases.
EV charging increases.

Forecast Agent detects the issue.

Grid Agent predicts overload.

Market Agent starts negotiation.

Solar Agent offers available surplus.

Battery Agent offers safe discharge.

EV agents delay flexible charging.

Consumer agents reduce flexible loads.

Market Agent executes P2P trades.

Optimizer validates allocation.

Safety layer validates all actions.

Simulator executes.

Grid Agent checks result.

Dashboard shows:

BEFORE
vs
AFTER

The goal is to visibly demonstrate:

"Grid Stress → Agent Coordination → Grid Stabilized"

==================================================
26. HACKATHON PRESENTATION
==================================================

The final system should make the following points easy to demonstrate:

Problem:
Distributed energy systems are difficult to coordinate.

Traditional approach:
Centralized optimization / fixed rules.

GRIDMIND:
Autonomous agents representing different stakeholders.

Innovation:
Independent agents with conflicting objectives communicate and negotiate.

Agentic behavior:

OBSERVE
→ REASON
→ PLAN
→ COMMUNICATE
→ NEGOTIATE
→ ACT
→ VERIFY
→ ADAPT

Technical credibility:
LLMs/agents handle reasoning and coordination.

Deterministic optimization handles numerical allocation.

Safety layer enforces constraints.

Simulator demonstrates real consequences.

==================================================
27. WHAT NOT TO BUILD
==================================================

Because this is a 24-hour hackathon, DO NOT waste time on:

- Blockchain
- Cryptocurrency
- Real electricity billing
- Real utility integration
- Physical smart meters
- Complex hardware
- Reinforcement learning
- Multi-microgrid distributed optimization
- Huge datasets
- Deep neural networks unless already trivial to integrate
- Overly complex authentication
- Overengineered microservices
- Kubernetes
- Cloud deployment before local MVP works

First make the local simulation excellent.

==================================================
28. DEVELOPMENT PRIORITY
==================================================

Priority order:

P0 — MUST WORK

1. Microgrid simulator
2. Baseline mode
3. Six agent types
4. Agent communication
5. Agent decisions
6. P2P negotiation
7. Battery/EV/load actions
8. Safety constraints
9. Grid stress detection
10. Dashboard
11. Baseline vs GridMind metrics
12. End-to-end crisis scenario

P1 — IMPORTANT

13. Agent memory
14. Better forecasting
15. Event timeline
16. Better visualizations
17. Emergency mode
18. Explainable decision logs

P2 — STRETCH

19. Real weather API
20. Improved forecasting
21. Carbon accounting
22. Voice explanation
23. More sophisticated market mechanism

Only work on P1/P2 after P0 is stable.

==================================================
29. IMPORTANT BEHAVIOR FOR YOU AS THE CODING AGENT
==================================================

You are not just a code generator.

Act as the project's engineering lead.

Before implementing something substantial:

- Inspect the existing repository.
- Understand the current architecture.
- Reuse existing code where appropriate.
- Avoid unnecessary rewrites.

After implementing:

- Build.
- Test.
- Run the simulator.
- Inspect output.
- Debug.
- Continue.

If a design decision is ambiguous, choose the simplest architecture that allows us to demonstrate the required behavior within the hackathon timeframe.

Do not over-engineer.

Do not create fake functionality merely to make the UI look impressive.

Every important dashboard value should originate from actual simulation state.

Every claimed improvement should come from an actual baseline-vs-GridMind simulation.

Every agent action should affect the simulated environment.

==================================================
30. FIRST TASK
==================================================

DO NOT immediately generate the entire application in one giant code dump.

First:

1. Inspect the repository.
2. Determine what already exists.
3. Create a concise implementation plan.
4. Propose the final folder structure.
5. Identify required dependencies.
6. Identify the smallest P0 MVP.
7. Then begin implementation.

Start with:

PHASE 1 — PROJECT FOUNDATION

Create:

- Backend skeleton
- Frontend skeleton
- Environment configuration
- Basic FastAPI server
- Basic Next.js dashboard
- Health-check endpoint
- Basic simulation data models
- Test infrastructure

Then BUILD and TEST.

After that, proceed incrementally through the milestones above.

IMPORTANT:
Do not stop after creating files.
Actually run the application.
Actually run tests.
Actually run the simulator.
Actually debug errors.

The final objective is a WORKING, DEMONSTRABLE, REPEATABLE multi-agent energy simulation — not merely a collection of source files.

==================================================
FINAL SUCCESS CONDITION
==================================================

The project is considered successful only when we can run one command / simple startup workflow and then:

1. Open the dashboard.
2. Select "Cloud Cover + Evening Peak."
3. Start simulation.
4. Watch energy conditions change.
5. See Forecast Agent predict the problem.
6. See Grid Agent identify future stress.
7. See agents communicate.
8. See Solar/Battery/EV/Consumer agents respond.
9. See Market Agent negotiate P2P energy.
10. See optimizer allocate resources.
11. See safety layer validate actions.
12. See simulator execute actions.
13. See grid stress decrease.
14. See live agent logs.
15. Compare Baseline vs GridMind.
16. Display actual calculated improvements.

The final demo should make a judge think:

"This isn't just an AI dashboard. These agents are actually coordinating an evolving energy system."

Begin by inspecting the repository and creating the implementation plan.
```