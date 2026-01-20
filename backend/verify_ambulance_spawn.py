"""
Emergency Vehicle Spawn Verification Script
This script helps verify that ambulances are spawning at the correct 2-minute intervals.
"""

def verify_spawn_schedule(max_steps=600, emergency_interval=120):
    """
    Verify the emergency vehicle spawn schedule.
    
    Args:
        max_steps: Total simulation steps to check (default 600 = 10 minutes)
        emergency_interval: Spawn interval in steps (default 120 = 2 minutes)
    """
    print("=" * 70)
    print("EMERGENCY VEHICLE SPAWN SCHEDULE VERIFICATION")
    print("=" * 70)
    print(f"\nConfiguration:")
    print(f"  Emergency Interval: {emergency_interval} steps ({emergency_interval/60:.1f} minutes)")
    print(f"  Simulation Duration: {max_steps} steps ({max_steps/60:.1f} minutes)")
    print(f"\nSpawn Condition: step >= {emergency_interval} and step % {emergency_interval} == 0")
    
    print("\n" + "-" * 70)
    print("EXPECTED SPAWN SCHEDULE:")
    print("-" * 70)
    print(f"{'Step':<10} {'Time (min:sec)':<15} {'Time (min)':<12} {'Spawns?':<10} {'Ambulance ID'}")
    print("-" * 70)
    
    spawn_count = 0
    spawn_steps = []
    
    for step in range(0, max_steps + 1, 10):  # Check every 10 steps for readability
        minutes = step // 60
        seconds = step % 60
        time_str = f"{minutes}:{seconds:02d}"
        time_decimal = step / 60.0
        
        # Check spawn condition
        will_spawn = step >= emergency_interval and step % emergency_interval == 0
        
        if will_spawn:
            spawn_count += 1
            spawn_steps.append(step)
            ambulance_id = f"ambulance_{step}"
            print(f"{step:<10} {time_str:<15} {time_decimal:<12.1f} {'✓ YES':<10} {ambulance_id}")
        elif step % 60 == 0:  # Show every minute for context
            print(f"{step:<10} {time_str:<15} {time_decimal:<12.1f} {'No':<10} -")
    
    print("-" * 70)
    print(f"\nSUMMARY:")
    print(f"  Total Spawns: {spawn_count}")
    print(f"  Spawn Steps: {spawn_steps}")
    print(f"  Expected Spawns: {len([s for s in range(emergency_interval, max_steps + 1, emergency_interval)])}")
    
    # Verify intervals
    print(f"\nINTERVAL VERIFICATION:")
    if len(spawn_steps) > 1:
        for i in range(1, len(spawn_steps)):
            interval = spawn_steps[i] - spawn_steps[i-1]
            status = "✓" if interval == emergency_interval else "✗"
            print(f"  {status} Spawn {i}: Step {spawn_steps[i-1]} → {spawn_steps[i]} (interval: {interval} steps)")
    
    print("\n" + "=" * 70)
    print("IMPORTANT NOTES:")
    print("=" * 70)
    print("1. Each spawn creates 1 ambulance in EACH simulation window (RL + Fixed)")
    print("   → You will see 2 ambulances total at each spawn time")
    print("2. First spawn occurs at step 120 (2:00 minutes)")
    print("3. Ambulances remain visible until they complete their route")
    print("4. You may see multiple ambulances if previous ones haven't finished")
    print("=" * 70)


if __name__ == "__main__":
    # Default verification (10 minutes)
    verify_spawn_schedule(max_steps=600, emergency_interval=120)
    
    print("\n\n")
    
    # Show what happens with different intervals
    print("\nALTERNATIVE CONFIGURATIONS:")
    print("=" * 70)
    
    configs = [
        (300, 60),   # 5 minutes, 1-minute intervals
        (600, 180),  # 10 minutes, 3-minute intervals
        (600, 300),  # 10 minutes, 5-minute intervals
    ]
    
    for max_steps, interval in configs:
        spawn_count = len([s for s in range(interval, max_steps + 1, interval)])
        print(f"\nInterval: {interval} steps ({interval/60:.1f} min) | Duration: {max_steps/60:.1f} min")
        print(f"  → {spawn_count} ambulance spawns")
        print(f"  → Steps: {list(range(interval, max_steps + 1, interval))}")
