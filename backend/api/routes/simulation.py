"""
Simulation API Routes
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict
import os
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from core.dual_simulation_manager import DualSimulationManager

router = APIRouter()

# Global simulation manager instance
simulation_manager: Optional[DualSimulationManager] = None
simulation_results: Dict = {}


class SimulationConfig(BaseModel):
    scenario: str  # "single", "grid", "bangalore_silk_board", "bangalore_hosmat"
    max_steps: int = 5400
    n_cars: int = 1000
    gui: bool = False
    seed: int = 42
    emergency_interval: int = 120  # Spawn one ambulance every 2 minutes (120 seconds)


class SimulationControl(BaseModel):
    action: str  # "start", "pause", "stop", "reset"


@router.post("/initialize")
async def initialize_simulation(config: SimulationConfig):
    """
    Initialize simulation with specified configuration.
    """
    global simulation_manager
    
    try:
        # Determine network path based on scenario
        # Get project root (3 levels up from this file: routes -> api -> backend -> root)
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        
        scenario_paths = {
            "single": os.path.join(project_root, "intersection"),
            "grid": os.path.join(project_root, "backend", "sumo", "networks", "grid_network"),
            "bangalore_hosmat": os.path.join(project_root, "backend", "sumo", "networks", "bangalore_hosmat"),
            "bangalore_hebbal": os.path.join(project_root, "backend", "sumo", "networks", "bangalore_hebbal")
        }
        
        network_path = scenario_paths.get(config.scenario)
        if not network_path:
            raise HTTPException(status_code=400, detail=f"Invalid scenario: {config.scenario}")
        
        # Verify path exists
        if not os.path.exists(network_path):
            raise HTTPException(status_code=404, detail=f"Network path not found: {network_path}")
        
        # Model path
        model_path = os.path.join(project_root, "models", "model_2")
        
        # Create simulation manager
        simulation_manager = DualSimulationManager(
            network_path=network_path,
            model_path=model_path,
            max_steps=config.max_steps,
            n_cars=config.n_cars,
            gui=config.gui,
            seed=config.seed
        )
        
        # Set emergency interval
        simulation_manager.emergency_interval = config.emergency_interval
        
        simulation_manager.initialize()
        
        return {
            "status": "initialized",
            "scenario": config.scenario,
            "network_path": network_path,
            "model_path": model_path
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{action}")
async def control_simulation_action(action: str, background_tasks: BackgroundTasks):
    """
    Control simulation via path parameter (start/stop/reset).
    Matches frontend calls like /api/simulation/start
    """
    global simulation_manager, simulation_results
    
    if not simulation_manager:
        raise HTTPException(status_code=400, detail="Simulation not initialized")
    
    try:
        if action == "start":
            # Run simulation in background
            background_tasks.add_task(run_simulation_background)
            return {"status": "started"}
            
        elif action == "stop":
            simulation_manager.stop()
            return {"status": "stopped"}
            
        elif action == "reset":
            simulation_manager = None
            simulation_results = {}
            return {"status": "reset"}
            
        else:
            raise HTTPException(status_code=400, detail=f"Invalid action: {action}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/control")
async def control_simulation(control: SimulationControl, background_tasks: BackgroundTasks):
    """
    Control simulation execution (Legacy/Body support).
    """
    return await control_simulation_action(control.action, background_tasks)


async def run_simulation_background():
    """
    Run simulation in background task (Threaded).
    """
    global simulation_manager, simulation_results
    import asyncio
    
    try:
        # Run synchronous simulation_manager.run_simulation in a separate thread
        # This prevents blocking the main event loop
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(None, simulation_manager.run_simulation, "both")
        simulation_results = results
    except Exception as e:
        print(f"Simulation error: {e}")


@router.get("/status")
async def get_simulation_status():
    """
    Get current simulation status.
    """
    global simulation_manager
    
    if not simulation_manager:
        return {
            "initialized": False,
            "running": False
        }
    
    return {
        "initialized": True,
        "running": simulation_manager.is_running,
        "current_step": simulation_manager.current_step,
        "max_steps": simulation_manager.max_steps
    }


@router.get("/results")
async def get_simulation_results():
    """
    Get simulation results.
    """
    global simulation_results
    
    if not simulation_results:
        raise HTTPException(status_code=404, detail="No results available")
    
    return simulation_results


@router.get("/comparison")
async def get_comparison_metrics():
    """
    Get comparative metrics between RL and Fixed-time control.
    """
    global simulation_manager
    
    if not simulation_manager:
        raise HTTPException(status_code=400, detail="Simulation not initialized")
    
    try:
        metrics = simulation_manager.get_comparison_metrics()
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
