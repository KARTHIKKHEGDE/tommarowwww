"""
Emergency Vehicle Spawn Diagnostics
This script helps debug ambulance spawning issues
"""

# Expected behavior with current settings:
EMERGENCY_INTERVAL = 120  # seconds (2 minutes)
MAX_STEPS = 5400  # Total simulation steps
STEP_DURATION = 1  # 1 step = 1 second in SUMO

# Calculate expected spawns
total_spawns = MAX_STEPS // EMERGENCY_INTERVAL
spawn_times = [i * EMERGENCY_INTERVAL for i in range(1, total_spawns + 1)]

print("=" * 60)
print("🚑 EMERGENCY VEHICLE SPAWN SCHEDULE")
print("=" * 60)
print(f"Spawn Interval: Every {EMERGENCY_INTERVAL} seconds ({EMERGENCY_INTERVAL/60:.1f} minutes)")
print(f"Total Simulation Time: {MAX_STEPS} seconds ({MAX_STEPS/60:.1f} minutes)")
print(f"Expected Total Spawns: {total_spawns} ambulances")
print()
print("Spawn Schedule (Step Number → Time):")
print("-" * 60)

for i, step in enumerate(spawn_times, 1):
    minutes = step // 60
    seconds = step % 60
    print(f"  Spawn #{i:2d}: Step {step:4d} → {minutes:2d}m {seconds:2d}s")

print()
print("=" * 60)
print("IMPORTANT NOTES:")
print("=" * 60)
print("1. You see TWO windows (RL + Fixed-Time)")
print("   → Each spawn creates 1 ambulance in EACH window")
print("   → Total visible: 2 ambulances per spawn event")
print()
print("2. If you see MORE than 2 ambulances at once:")
print("   → Check if multiple backend servers are running")
print("   → Stop duplicate servers (you have 2 running now!)")
print()
print("3. Ambulances are RED vehicles with 'ambulance_XXX' IDs")
print()
print("=" * 60)
print("TROUBLESHOOTING:")
print("=" * 60)
print("✓ Stop all backend servers")
print("✓ Start only ONE backend server")
print("✓ Start the simulation")
print("✓ Count ambulances - should be max 2 at spawn time")
print("=" * 60)
