from __future__ import annotations
import os
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import router, websocket_endpoint

app = FastAPI(
    title="GRIDMIND API",
    description="Autonomous Multi-Agent Energy Management & P2P Energy Trading Simulation Engine",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.websocket("/ws")
async def websocket_ws(websocket: WebSocket):
    await websocket_endpoint(websocket)

@app.get("/")
def root():
    return {
        "message": "Welcome to GRIDMIND — Autonomous Multi-Agent Energy Management System",
        "docs": "/docs",
        "health": "/api/health",
        "state": "/api/state"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
