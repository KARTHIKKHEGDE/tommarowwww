import numpy as np

class CurveGenerator:
    @staticmethod
    def generate_fixed_waiting_time(steps):
        """
        Simulates increasing congestion over time.
        Fixed-time controller gets worse as traffic builds up.
        """
        # Random starting waiting time (Low traffic initially)
        # User Req: First 20s < 20-30s
        start_wait = np.random.uniform(22, 28)
        
        # Random ending waiting time (Heavy congestion)
        # User Req: Increase till 80-120s
        end_wait = np.random.uniform(95, 115)
        
        # Normalized time
        t = np.linspace(0, 1, steps)
        
        # Non-linear congestion growth
        # Uses quadratic + linear blend (mimics real traffic buildup)
        base_curve = start_wait + (end_wait - start_wait) * (0.6 * t + 0.4 * t**2)
        
        # Add realistic micro-fluctuations (High Variance)
        noise = np.random.normal(0, 8.0, steps)  # Increased noise from 2.5 to 8.0
        # Light smoothing to keep it jagged but readable
        smoothed_noise = np.convolve(noise, np.ones(3)/3, mode='same')
        
        # Combine
        fixed_wait = base_curve + smoothed_noise
        
        # Ensure values stay in realistic bounds
        fixed_wait = np.clip(fixed_wait, start_wait * 0.8, end_wait * 1.1)
        
        return fixed_wait

    @staticmethod
    def generate_improvement_curve(steps, metric_type='waiting_time', step_length=0.5):
        """
        Creates phase-based learning curve with proper RL characteristics.
        Saturates in approx 2-3 minutes (120-180s), then maintains saturation.
        """
        # Metric-specific ranges
        ranges = {
            'waiting_time': {'start': (0.07, 0.15), 'sat': (0.44, 0.67)},   
            'queue_length': {'start': (0.05, 0.12), 'sat': (0.25, 0.33)},   
            'throughput':   {'start': (0.08, 0.14), 'sat': (0.32, 0.39)},   
            'efficiency':   {'start': (0.12, 0.18), 'sat': (0.35, 0.70)}
        }
        
        config = ranges.get(metric_type, ranges['waiting_time'])
        
        # Random start and saturation within bounds
        start_improvement = np.random.uniform(*config['start'])
        
        sat_min, sat_max = config['sat']
        saturation_improvement = np.random.uniform(sat_min * 0.9, sat_max * 1.1)
        
        # Initialize curve
        curve = np.zeros(steps)
        curve[0] = start_improvement
        
        # TIME-BASED PHASES
        # User wants saturation in ~2-3 minutes (120-180s)
        saturation_time = np.random.uniform(140, 190) 
        
        for i in range(1, steps):
            current_time = i * step_length
            
            # Progress ratio (0 to 1) relative to SATURATION TIME, not total duration
            progress = min(1.0, current_time / saturation_time)
            
            # PHASE LOGIC based on Progress to Saturation
            if progress < 0.2:
                # Exploration (Slow start)
                k = 0.5 
            elif progress < 1.0:
                # Learning (Fast climb)
                k = 3.0 # Steepness factor
            else:
                # Converged (Stable)
                k = 0.0
                
            # Target value at this moment
            # Sigmoid-like interpolation for smooth curve
            if progress < 1.0:
                 # Normalized time in [0, 1]
                 p = progress
                 # Cubic ease-in-out or similar
                 factor = p * p * (3 - 2 * p) 
                 target = start_improvement + (saturation_improvement - start_improvement) * factor
            else:
                 target = saturation_improvement

            # Apply changing target with noise
            # Instead of differential updates, we calculate target and add noise
            # This is more stable for long durations
            
            # Base Noise
            noise = np.random.normal(0, 0.02) 
            
            # Oscillation for "Alive" feel
            if progress >= 1.0:
                # Add larger slow waves in saturation phase
                wave = 0.03 * np.sin(current_time / 10.0) # Slow wave
                jitter = np.random.normal(0, 0.01)       # Fast jitter
                val = target + wave + jitter
            else:
                val = target + noise
                
            curve[i] = val
        
        # Final relax clamping
        curve = np.clip(curve, start_improvement * 0.5, saturation_improvement * 1.3)
        
        return curve

    @staticmethod
    def generate_rl_values(fixed_values, improvement_curve):
        """
        Derives RL performance from fixed baseline and improvement curve.
        """
        steps = len(fixed_values)
        
        # Policy stochasticity (High Variance)
        policy_noise = np.random.normal(0, 5.0, steps) # Increased from 1.5
        policy_noise = np.convolve(policy_noise, np.ones(2)/2, mode='same') # Less smoothing
        
        # Core calculation
        rl_values = fixed_values * (1 - improvement_curve) + policy_noise
        
        # Ensure RL never exceeds Fixed (worse than baseline) too much
        rl_values = np.minimum(rl_values, fixed_values * 0.98)
        
        # Ensure RL isn't unrealistically better
        rl_values = np.maximum(rl_values, fixed_values * 0.2)
        
        return rl_values

    @staticmethod
    def generate_rl_throughput(fixed_values, improvement_curve):
        """
        Derives RL throughput (HIGHER is better).
        """
        steps = len(fixed_values)
        policy_noise = np.random.normal(0, 15, steps) # Increased noise
        
        # Throughput increases with improvement
        rl_values = fixed_values * (1 + improvement_curve) + policy_noise
        
        return rl_values

    @classmethod
    def generate_complete_training_data(cls):
        """
        Generates all data for one training run across multiple metrics.
        """
        # Step 1: Random duration - User Req: "no finite end value", "if sumo stops then this stops"
        # Since we are "playing back" generated data in DeepAnalytics, we need a buffer LONG enough to cover any reasonable session.
        # 3600 seconds = 1 hour.
        duration_sec = 3600 
        step_length = 0.5 # 0.5s resolution
        steps = int(duration_sec / step_length)

        
        time_seconds = np.arange(steps) * step_length
        
        # --- Waiting Time (Lower is Better) ---
        wait_fixed = cls.generate_fixed_waiting_time(steps)
        wait_imp = cls.generate_improvement_curve(steps, 'waiting_time')
        wait_rl = cls.generate_rl_values(wait_fixed, wait_imp)
        
        # --- Queue Length (Lower is Better) ---
        # Queue roughly correlates with waiting time but with different scale
        queue_scale_factor = np.random.uniform(0.15, 0.25)
        queue_fixed = wait_fixed * queue_scale_factor + np.random.normal(0, 1, steps)
        queue_imp = cls.generate_improvement_curve(steps, 'queue_length')
        queue_rl = cls.generate_rl_values(queue_fixed, queue_imp)
        
        # --- Throughput (Higher is Better) ---
        # Throughput is roughly inverse of congestion, or just increasing over time as more cars enter?
        # Actually, if congestion is high (wait time high), throughput might saturate or drop.
        # But usually throughput is "cars served".
        # Let's generate a base throughput that climbs then plateaus
        t = np.linspace(0, 1, steps)
        thru_base = 800 + 400 * np.sin(t * np.pi / 2) + np.random.normal(0, 10, steps) # Base flow
        thru_fixed = thru_base  # Fixed serves this much
        thru_imp = cls.generate_improvement_curve(steps, 'throughput')
        thru_rl = cls.generate_rl_throughput(thru_fixed, thru_imp)

        # --- Efficiency (Higher is Better) ---
        # Synthetic score
        eff_fixed = np.random.uniform(40, 60, steps) # Baseline efficiency usually low/steady
        eff_imp = cls.generate_improvement_curve(steps, 'efficiency')
        eff_rl = eff_fixed * (1 + eff_imp * 1.5) # RL boosts efficiency significantly

        return {
            'duration': duration_sec,
            'time_points': time_seconds.tolist(),
            'metrics': {
                'waiting_time': {
                    'fixed': wait_fixed.tolist(),
                    'rl': wait_rl.tolist(),
                    'improvement': (wait_imp * 100).tolist()
                },
                'queue_length': {
                    'fixed': queue_fixed.tolist(),
                    'rl': queue_rl.tolist(),
                    'improvement': (queue_imp * 100).tolist()
                },
                'throughput': {
                    'fixed': thru_fixed.tolist(),
                    'rl': thru_rl.tolist(),
                    'improvement': (thru_imp * 100).tolist()
                },
                'efficiency': {
                    'fixed': eff_fixed.tolist(),
                    'rl': eff_rl.tolist(),
                    'improvement': (eff_imp * 100).tolist()
                }
            },
            'summary': {
                'waiting_time_improvement': float(wait_imp[-1] * 100),
                'queue_improvement': float(queue_imp[-1] * 100),
                'throughput_increase': float(thru_imp[-1] * 100),
                'rl_avg_wait': float(np.mean(wait_rl)),
                'fixed_avg_wait': float(np.mean(wait_fixed))
            }
        }
