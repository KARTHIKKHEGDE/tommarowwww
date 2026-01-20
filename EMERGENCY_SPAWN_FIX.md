# Emergency Vehicle Spawn Fix - Summary

## Issue
Ambulances were appearing too frequently in the simulation, instead of the intended once every 2 minutes.

## Root Cause
The spawning condition `if step > 0 and step % self.emergency_interval == 0:` would trigger at step 0 (since 0 % 120 == 0), potentially causing unexpected behavior.

**However, the main issue was in the API route configuration:**
- In `api/routes/simulation.py`, the `SimulationConfig` class had `emergency_interval: int = 30` as the default value
- This was **overriding** the value set in `DualSimulationManager.__init__()` (which was correctly set to 120)
- Result: Ambulances were spawning every 30 steps (0.5 minutes) instead of every 120 steps (2 minutes)

## Changes Made

### 1. **Fixed API Route Default Value** (`api/routes/simulation.py`) - **CRITICAL FIX**
**Before:**
```python
class SimulationConfig(BaseModel):
    emergency_interval: int = 30
```

**After:**
```python
class SimulationConfig(BaseModel):
    emergency_interval: int = 120  # Spawn one ambulance every 2 minutes (120 seconds)
```

**Effect:** 
- This was the **main issue** - the API was overriding the correct value with 30 seconds
- Now the API correctly defaults to 120 seconds (2 minutes)

### 2. **Updated Spawn Timing Logic** (`dual_simulation_manager.py`)
**Before:**
```python
if step > 0 and step % self.emergency_interval == 0:
    self._spawn_emergency_vehicle(step, conn_rl, conn_fixed)
```

**After:**
```python
if step >= self.emergency_interval and step % self.emergency_interval == 0:
    self._spawn_emergency_vehicle(step, conn_rl, conn_fixed)
```

**Effect:** 
- First ambulance now spawns at step 120 (2 minutes) instead of potentially at step 0
- Subsequent spawns at steps 240, 360, 480, etc. (every 2 minutes)
- Ensures clean 2-minute intervals throughout the simulation

### 3. **Enhanced Logging** (`dual_simulation_manager.py`)
Added detailed console output when ambulances spawn:
```
🚑 [Step 120 | 2.0 min] Spawning Emergency Vehicle
   Vehicle ID: ambulance_120
   Route: route_0
   Next spawn in: 120 steps (2 minutes)
   ✓ Spawned in RL simulation
   ✓ Spawned in Fixed simulation
```

**Benefits:**
- Easy to verify the 2-minute interval is working correctly
- Shows time in both steps and minutes for clarity
- Confirms successful spawn in both simulation windows
- Helps debug any spawn issues

### 4. **Updated Documentation** (`EMERGENCY_PREEMPTION.md`)
Added clear spawn schedule:
- First ambulance: Step 120 (2 minutes)
- Second ambulance: Step 240 (4 minutes)
- Third ambulance: Step 360 (6 minutes)
- Pattern continues every 120 steps

Also clarified that each spawn creates ONE ambulance in EACH window (RL and Fixed), so you see 2 ambulances total at spawn time.

## Expected Behavior

### Spawn Schedule
| Time (minutes) | Step | Ambulances Visible |
|----------------|------|-------------------|
| 0:00 - 1:59    | 0-119 | 0 |
| 2:00           | 120  | 2 (1 in each window) |
| 2:01 - 3:59    | 121-239 | 0-2 (depends on travel time) |
| 4:00           | 240  | 2 (1 in each window) |
| 4:01 - 5:59    | 241-359 | 0-2 (depends on travel time) |
| 6:00           | 360  | 2 (1 in each window) |

### Important Notes
1. **Two Windows = Two Ambulances**: Since you run both RL and Fixed-Time simulations simultaneously, each spawn creates 2 visible ambulances (one per window)
2. **Ambulance Lifetime**: Ambulances remain in the simulation until they complete their route, so you might see previous ambulances still traveling when new ones spawn
3. **Duplicate Prevention**: The code includes logic to prevent spawning multiple ambulances at the same step

## Testing
To verify the fix:
1. Restart your simulation (the backend server should auto-reload)
2. Watch the console output for spawn messages
3. First ambulance should appear at exactly 2:00 minutes (step 120)
4. Subsequent ambulances every 2 minutes thereafter
5. You should see 2 red ambulances per spawn (one in each window)

## Configuration
To change the spawn interval, modify this line in `dual_simulation_manager.py`:
```python
self.emergency_interval = 120  # Change this value (in seconds/steps)
```

Examples:
- `60` = One ambulance every minute
- `180` = One ambulance every 3 minutes
- `300` = One ambulance every 5 minutes
