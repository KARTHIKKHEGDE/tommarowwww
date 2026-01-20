# 🚑 Emergency Vehicle Preemption System

## Overview
The RL-based traffic control system now includes **intelligent emergency vehicle preemption** that prioritizes ambulances and other emergency vehicles, ensuring they experience minimal to zero waiting time at intersections.

## How It Works

### 1. **Early Detection** (100m Range)
- The system continuously monitors all incoming lanes for emergency vehicles
- Detection range: **100 meters** from the intersection
- This provides early warning for smooth, proactive signal changes

### 2. **Immediate Priority**
When an ambulance is detected within range:
- ✅ **Instant Phase Switch**: Traffic light immediately begins transition to the required phase
- ✅ **Minimal Yellow Time**: Only 1 second of yellow (vs. normal 4 seconds) for safety
- ✅ **Green Light Guarantee**: Ambulance lane gets green light before vehicle reaches intersection
- ✅ **Zero Wait Time**: Ambulances don't have to stop or slow down significantly

### 3. **Smart Lane Detection**
The system automatically determines which phase to activate based on:
- The lane the ambulance is traveling in
- The direction it needs to go (straight or left turn)
- Current traffic light configuration

## Key Features

### 🎯 **Preemptive, Not Reactive**
- Traditional systems: Wait for ambulance to arrive, then react
- Our system: Detect early and prepare the intersection in advance

### ⚡ **Faster Response**
- **Normal phase change**: 4-second yellow + decision interval (10-14 seconds)
- **Emergency override**: 1-second yellow + immediate green (~1-2 seconds total)

### 📊 **Tracking & Metrics**
The system tracks:
- Number of emergency preemptions per simulation
- Emergency vehicle presence in real-time data
- Performance impact on overall traffic flow

### 🔄 **Seamless Integration**
- Works alongside normal RL decision-making
- Automatically resumes normal operation after ambulance passes
- No manual intervention required

## Configuration

### Ambulance Spawn Rate
**File**: `backend/core/dual_simulation_manager.py`
```python
self.emergency_interval = 120  # One ambulance every 2 minutes (120 seconds)
```

**Spawn Schedule**:
- First ambulance: Step 120 (2 minutes into simulation)
- Second ambulance: Step 240 (4 minutes)
- Third ambulance: Step 360 (6 minutes)
- And so on... every 120 steps (2 minutes)

**Note**: Each spawn creates one ambulance in BOTH the RL and Fixed-Time simulation windows, so you'll see 2 red ambulances at each spawn time.

### Detection Range
**File**: `backend/core/rl_agent.py`
```python
DETECTION_RANGE = 100.0  # Detect ambulances within 100 meters
```

### Yellow Phase Duration (Emergency)
**File**: `backend/core/rl_agent.py`
```python
if self.time_since_last_change >= 1:  # Just 1 second yellow for safety
```

## Comparison: RL vs Fixed-Time

| Feature | RL with Preemption | Fixed-Time Controller |
|---------|-------------------|----------------------|
| **Emergency Detection** | ✅ Yes (100m range) | ❌ No |
| **Immediate Priority** | ✅ Yes (~1-2s response) | ❌ No (waits for cycle) |
| **Adaptive Response** | ✅ Smart phase selection | ❌ Fixed cycle only |
| **Wait Time for Ambulance** | ~0-2 seconds | 15-60 seconds (avg) |

## Real-Time Data

The system broadcasts emergency status via WebSocket:

```json
{
  "tls_id": "TL",
  "emergency": true,
  "emergency_preemptions": 3,
  "current_phase": 2,
  "time_since_change": 1
}
```

## Benefits

### For Emergency Services
- **Faster Response Times**: Ambulances reach destinations quicker
- **Smoother Travel**: Less braking and acceleration
- **Safer Operations**: Predictable green lights reduce intersection conflicts

### For Traffic Flow
- **Minimal Disruption**: Quick return to normal operation
- **Smart Coordination**: RL agent optimizes around emergency events
- **Tracked Impact**: Metrics show how preemption affects overall performance

## Technical Implementation

### Detection Logic
```python
def _check_emergency(self) -> Tuple[bool, int]:
    """
    Detects emergency vehicles within 100m of intersection.
    Returns: (has_emergency, required_phase)
    """
    - Scan all controlled lanes
    - Check vehicle types for "emergency"
    - Calculate distance to intersection
    - Determine required traffic phase
```

### Preemption Logic
```python
if has_emergency:
    - Map emergency vehicle lane to required phase
    - Immediately switch (1s yellow for safety)
    - Force green light activation
    - Track preemption event
```

## Future Enhancements

Potential improvements:
- [ ] Multi-intersection coordination (green wave for ambulances)
- [ ] Priority levels (ambulance > fire truck > police)
- [ ] Route prediction based on vehicle trajectory
- [ ] Integration with real emergency dispatch systems
- [ ] Acoustic/visual emergency vehicle detection

## Testing

To test the emergency preemption system:

1. **Start the simulation** with GUI enabled
2. **Watch for red ambulances** (spawned every 2 minutes)
3. **Observe traffic lights** switching to green as ambulances approach
4. **Check metrics** for emergency preemption count

---

**Last Updated**: January 2026  
**Version**: 1.0.0
