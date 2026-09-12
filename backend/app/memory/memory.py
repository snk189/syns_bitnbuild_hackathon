from __future__ import annotations
import sqlite3
import json
import os
from typing import Dict, Any, List, Optional
from datetime import datetime

class AgentMemory:
    """
    Persistent Short-Term & Historical Memory for Autonomous Grid Agents.
    Stores past decisions, typical consumption/generation profiles, and trading outcomes.
    """
    def __init__(self, db_path: str = "gridmind_memory.db"):
        self.db_path = db_path
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.execute("PRAGMA journal_mode = WAL")
        self.conn.execute("PRAGMA synchronous = OFF")
        self.conn.execute("PRAGMA temp_store = MEMORY")
        self._init_db()

    def _init_db(self):
        cursor = self.conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS agent_memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_name TEXT NOT NULL,
                category TEXT NOT NULL,
                key TEXT NOT NULL,
                value_json TEXT NOT NULL,
                step INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS decision_audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                step INTEGER,
                time_str TEXT,
                agent_name TEXT,
                observation TEXT,
                decision TEXT,
                reason TEXT,
                state_json TEXT,
                constraints_json TEXT,
                tools_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.conn.commit()
        self._seed_default_memories()

    def _seed_default_memories(self):
        cursor = self.conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM agent_memories")
        if cursor.fetchone()[0] == 0:
            defaults = [
                ("H_NORTH_1", "PROFILE", "typical_evening_demand", {"kw": 4.6, "peak_hour": "19:30"}),
                ("H_EAST_1", "PROFILE", "typical_evening_demand", {"kw": 22.0, "peak_hour": "20:00"}),
                ("EV_FLEET_01", "HABIT", "charging_window", {"arrival": "17:30", "deadline": "22:00", "required_kwh": 30.0}),
                ("BATT_CENTRAL_01", "HEALTH", "cycle_history", {"degradation_rate_pct_per_100_cycles": 0.45, "preferred_reserve_pct": 25.0}),
                ("SOLAR_FARM_MAIN", "SOLAR", "midday_surplus_window", {"start": "11:00", "end": "14:30", "expected_surplus_kw": 42.0})
            ]
            for agent, cat, key, val in defaults:
                cursor.execute(
                    "INSERT INTO agent_memories (agent_name, category, key, value_json, step) VALUES (?, ?, ?, ?, ?)",
                    (agent, cat, key, json.dumps(val), 0)
                )
            self.conn.commit()

    def record_memory(self, agent_name: str, category: str, key: str, value: Any, step: int = 0):
        cursor = self.conn.cursor()
        cursor.execute(
            "INSERT INTO agent_memories (agent_name, category, key, value_json, step) VALUES (?, ?, ?, ?, ?)",
            (agent_name, category, key, json.dumps(value), step)
        )
        self.conn.commit()

    def recall_memory(self, agent_name: str, key: str) -> Optional[Any]:
        cursor = self.conn.cursor()
        cursor.execute(
            "SELECT value_json FROM agent_memories WHERE agent_name = ? AND key = ? ORDER BY id DESC LIMIT 1",
            (agent_name, key)
        )
        row = cursor.fetchone()
        if row:
            return json.loads(row[0])
        return None

    def log_decision(
        self,
        step: int,
        time_str: str,
        agent_name: str,
        observation: str,
        decision: str,
        reason: str,
        state: Dict[str, Any],
        constraints: List[str],
        tools: List[str]
    ):
        cursor = self.conn.cursor()
        cursor.execute("""
            INSERT INTO decision_audit_logs 
            (step, time_str, agent_name, observation, decision, reason, state_json, constraints_json, tools_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            step,
            time_str,
            agent_name,
            observation,
            decision,
            reason,
            json.dumps(state),
            json.dumps(constraints),
            json.dumps(tools)
        ))
        self.conn.commit()

    def get_recent_decisions(self, limit: int = 40) -> List[Dict[str, Any]]:
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT step, time_str, agent_name, observation, decision, reason, state_json, constraints_json, tools_json, created_at
            FROM decision_audit_logs
            ORDER BY id DESC
            LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        logs = []
        for r in rows:
            logs.append({
                "step": r[0],
                "time_str": r[1],
                "agent": r[2],
                "observation": r[3],
                "decision": r[4],
                "reason": r[5],
                "state": json.loads(r[6]) if r[6] else {},
                "constraints": json.loads(r[7]) if r[7] else [],
                "tools_used": json.loads(r[8]) if r[8] else [],
                "timestamp": r[9]
            })
        return logs

    def close(self):
        try:
            self.conn.close()
        except Exception:
            pass
