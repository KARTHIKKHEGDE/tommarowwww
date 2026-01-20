"""
RL-Based Traffic Signal Controller
Uses the trained Deep Q-Learning model for adaptive traffic control
"""
import os
import sys
import numpy as np
import traci
from typing import Dict, List, Tuple

# Add parent directory to path to import model
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from model import TestModel


class RLAgent:
    """
    Reinforcement Learning agent for traffic signal control.
    Uses trained DQN model to make adaptive decisions based on traffic state.
    """
    
    # Phase codes based on SUMO network configuration
    PHASE_NS_GREEN = 0      # North-South straight
    PHASE_NS_YELLOW = 1
    PHASE_NSL_GREEN = 2     # North-South left turn
    PHASE_NSL_YELLOW = 3
    PHASE_EW_GREEN = 4      # East-West straight
    PHASE_EW_YELLOW = 5
    PHASE_EWL_GREEN = 6     # East-West left turn
    PHASE_EWL_YELLOW = 7
    
    
    def __init__(
        self,
        tls_id: str,
        model_path: str,
        connection, # TraCI connection
        num_states: int = 80,
        num_actions: int = 4,
        green_duration: int = 10,
        yellow_duration: int = 4
    ):
        """
        Initialize RL agent with trained model.
        """
        self.tls_id = tls_id
        self.connection = connection
        self.num_states = num_states
        self.num_actions = num_actions
        self.green_duration = green_duration
        self.yellow_duration = yellow_duration
        
        # Load trained model
        self.model = TestModel(input_dim=num_states, model_path=model_path)
        
        # State tracking
        self.current_phase = 0
        self.time_since_last_change = 0
        self.waiting_times = {}
        self.total_waiting_time = 0
        self.queue_length = 0
        
        # Performance metrics
        self.metrics = {
            'waiting_time': [],
            'queue_length': [],
            'throughput': 0,
            'phase_changes': 0,
            'decisions': []
        }

        # Dynamic Phase Detection
        self.available_phases = []
        self.action_phase_map = {}
        self._detect_phases()
        
    def _detect_phases(self):
        """
        Dynamically map RL Actions (0-3) to Physical Phases based on lane geometry.
        Action 0: NS Straight (Dirs 2, 6)
        Action 1: NS Left (Dirs 3, 7)
        Action 2: EW Straight (Dirs 0, 4)
        Action 3: EW Left (Dirs 1, 5)
        """
        try:
            # Get phase logic
            logics = self.connection.trafficlight.getAllProgramLogics(self.tls_id)
            if not logics: return
            logic = logics[0]
            
            # Get links (connections) for each signal index
            # links[i] = [(from, to, via), ...]
            links = self.connection.trafficlight.getControlledLinks(self.tls_id)
            
            # 1. Map Signal Indices to Directions
            # index_directions[i] = {dir_code, ...}
            index_directions = {}
            for i, connection_list in enumerate(links):
                dirs = set()
                for conn in connection_list:
                    incoming_lane = conn[0]
                    d = self._get_lane_group(incoming_lane)
                    if d != -1: dirs.add(d)
                index_directions[i] = dirs

            # 2. Analyze Each Phase
            # phase_serves[p_idx] = {dir_code, ...}
            phase_serves = {}
            valid_phases = []
            
            for p_idx, phase in enumerate(logic.phases):
                served = set()
                # Check for Green
                if 'G' in phase.state or 'g' in phase.state:
                    # Collect directions served by this phase
                    for i, char in enumerate(phase.state):
                        if char in ['G', 'g'] and i in index_directions:
                            served.update(index_directions[i])
                    
                    if served:
                         phase_serves[p_idx] = served
                         valid_phases.append(p_idx)

            self.available_phases = valid_phases or list(range(0, len(logic.phases), 2))

            # 3. Map Actions to Best Phases
            # Target Directions for each Action
            action_targets = {
                0: {2, 6}, # NS Straight
                1: {3, 7}, # NS Left
                2: {0, 4}, # EW Straight
                3: {1, 5}  # EW Left
            }

            for action_code, targets in action_targets.items():
                best_phase = -1
                best_score = -1
                
                for p_idx, served in phase_serves.items():
                    # Score = how many target directions are served
                    # Subtract penalty for serving non-target directions? (Optional)
                    
                    # Simple intersection: count matches
                    match_count = len(targets.intersection(served))
                    
                    if match_count > best_score:
                        best_score = match_count
                        best_phase = p_idx
                    elif match_count == best_score and match_count > 0:
                        # Tie breaker: prefer phase with fewer 'other' directions?
                        pass
                
                if best_phase != -1:
                    self.action_phase_map[action_code] = best_phase
                else:
                    # Fallback: Map to any valid phase cyclicly
                    if self.available_phases:
                        self.action_phase_map[action_code] = self.available_phases[action_code % len(self.available_phases)]
                    else:
                        self.action_phase_map[action_code] = 0

            # print(f"  RL Agent {self.tls_id} Map: {self.action_phase_map}")

        except Exception as e:
            # print(f"  RL Agent {self.tls_id} Phase Detection Failed: {e}")
            self.available_phases = [0, 2, 4, 6]
            self.action_phase_map = {0:0, 1:2, 2:4, 3:6}

    def step(self, simulation_step: int) -> Dict:
        """
        Execute one decision cycle.
        """
        # Get current traffic state
        state = self._get_state()
        
        # Collect metrics
        self._collect_waiting_times()
        self.queue_length = self._get_queue_length()
        
        # --- EMERGENCY VEHICLE LOGIC ---
        has_emergency, emergency_phase_idx = self._check_emergency()
        
        if has_emergency:
            # 🚑 Emergency Override
            # Map the returned "logical" phase index to a real green phase if needed
            # But _check_emergency currently returns 0/2/4/6.
            # We need to map those to self.available_phases if possible, or just use them if they are valid.
            # Actually, _check_emergency logic assumes standard grid.
            # For robustness, we should try to find the BEST green phase for the lane.
            # But for now, let's treat the index from _check_emergency as an Action Index (0..3)
            # and map it to a physical phase using our new dynamic map.
            
            # Re-map standard direction indices (0=NS, 1=NSL, 2=EW, 3=EWL) to available phases
            # This is a heuristic mapping
            action_idx = 0
            if emergency_phase_idx == self.PHASE_NS_GREEN: action_idx = 0
            elif emergency_phase_idx == self.PHASE_NSL_GREEN: action_idx = 1
            elif emergency_phase_idx == self.PHASE_EW_GREEN: action_idx = 2
            elif emergency_phase_idx == self.PHASE_EWL_GREEN: action_idx = 3
            
            # Get actual physical phase using the semantic map
            physical_phase = self.action_phase_map.get(action_idx, 0)

            if physical_phase != self.current_phase:
                if self.time_since_last_change >= self.yellow_duration:
                     self._set_yellow_phase(self.current_phase)
                     self.current_phase = physical_phase
                     self.metrics['phase_changes'] += 1
                     self.time_since_last_change = 0
            else:
                 if self.time_since_last_change >= self.yellow_duration:
                     self._set_green_phase_by_index(physical_phase) # Direct set
            
            self.time_since_last_change += 1
            
            # Get detailed lane queues
            lane_queues = self.get_lane_queue_lengths()

            return {
                'tls_id': self.tls_id,
                'current_phase': int(self.current_phase),
                'waiting_time': float(self.avg_waiting_time),
                'queue_length': int(self.queue_length),
                'time_since_change': int(self.time_since_last_change),
                'state': state.tolist(),
                'emergency': True,
                'lane_queues': lane_queues
            }
        # -------------------------------
        
        # Make decision every green_duration + yellow_duration seconds
        decision_interval = self.green_duration + self.yellow_duration
        
        if self.time_since_last_change >= decision_interval:
            # Choose action using trained model
            action = self._choose_action(state)
            
            # Map Action to Physical Phase using semantic map
            target_phase = self.action_phase_map.get(action, 0)
            
            # Apply action (with yellow phase transition if needed)
            if target_phase != self.current_phase:
                self._set_yellow_phase(self.current_phase)
                self.current_phase = target_phase
                self.metrics['phase_changes'] += 1
                
            self.time_since_last_change = 0
            
            # Record decision
            self.metrics['decisions'].append({
                'step': simulation_step,
                'state': state.tolist(),
                'action': int(action),
                'waiting_time': self.total_waiting_time,
                'queue_length': self.queue_length
            })
        else:
            # Continue current phase
            if self.time_since_last_change == self.yellow_duration:
                # Yellow phase complete, activate green
                self._set_green_phase_by_index(self.current_phase)
        
        self.time_since_last_change += 1
        
        # Update metrics
        self.metrics['waiting_time'].append(self.avg_waiting_time)
        self.metrics['queue_length'].append(self.queue_length)
        
        # Get detailed lane queues
        lane_queues = self.get_lane_queue_lengths()

        return {
            'tls_id': self.tls_id,
            'current_phase': int(self.current_phase),
            'waiting_time': float(self.avg_waiting_time),
            'queue_length': int(self.queue_length),
            'time_since_change': int(self.time_since_last_change),
            'state': state.tolist(),
            'lane_queues': lane_queues
        }

    def _check_emergency(self) -> Tuple[bool, int]:
        """
        Check for emergency vehicles in incoming lanes and return the required phase.
        Returns: (has_emergency, target_phase)
        """
        try:
            controlled_lanes = self.connection.trafficlight.getControlledLanes(self.tls_id)
            incoming_lanes = list(set(controlled_lanes))
            
            for lane_id in incoming_lanes:
                vehicles = self.connection.lane.getLastStepVehicleIDs(lane_id)
                for veh_id in vehicles:
                    v_type = self.connection.vehicle.getTypeID(veh_id)
                    if "emergency" in v_type:
                        # Found emergency vehicle!
                        # Determine required phase
                        lane_group = self._get_lane_group(lane_id)
                        
                        if lane_group in [2, 6]: return True, self.PHASE_NS_GREEN
                        if lane_group in [3, 7]: return True, self.PHASE_NSL_GREEN
                        if lane_group in [0, 4]: return True, self.PHASE_EW_GREEN
                        if lane_group in [1, 5]: return True, self.PHASE_EWL_GREEN
                        
        except Exception:
            pass
            
        return False, -1
    
    def _choose_action(self, state: np.ndarray) -> int:
        """
        Choose action using trained RL model.
        """
        # Reshape state for model input [1, input_dim]
        state_batch = np.reshape(state, [1, self.num_states])
        
        # Use direct call instead of predict() to avoid TF retracing warning in loops
        q_values = self.model.model(state_batch, training=False)[0]
        
        action = np.argmax(q_values)
        return action
    
    def _get_state(self) -> np.ndarray:
        """
        Get current traffic state from SUMO.
        """
        state = np.zeros(self.num_states)
        
        try:
            # Dynamically get controlled lanes for this TLS
            controlled_lanes = self.connection.trafficlight.getControlledLanes(self.tls_id)
            # Remove duplicates (getControlledLanes returns a list with duplicates for multiple connections)
            incoming_lanes = list(set(controlled_lanes))
            
            for lane_id in incoming_lanes:
                lane_group = self._get_lane_group(lane_id)
                if lane_group == -1: continue

                # Get vehicles on this lane
                vehicles = self.connection.lane.getLastStepVehicleIDs(lane_id)
                
                for car_id in vehicles:
                    lane_pos = self.connection.vehicle.getLanePosition(car_id)
                    lane_len = self.connection.lane.getLength(lane_id)
                    
                    # Invert position
                    dist_to_tls = lane_len - lane_pos
                    
                    # Map distance to cell (0-9)
                    if dist_to_tls < 7: lane_cell = 0
                    elif dist_to_tls < 14: lane_cell = 1
                    elif dist_to_tls < 21: lane_cell = 2
                    elif dist_to_tls < 28: lane_cell = 3
                    elif dist_to_tls < 40: lane_cell = 4
                    elif dist_to_tls < 60: lane_cell = 5
                    elif dist_to_tls < 100: lane_cell = 6
                    elif dist_to_tls < 160: lane_cell = 7
                    elif dist_to_tls < 400: lane_cell = 8
                    else: lane_cell = 9
                    
                    # Compose position index (0-79)
                    if lane_group == 0:
                        car_position = lane_cell
                    else:
                        car_position = int(str(lane_group) + str(lane_cell))
                    
                    if car_position < self.num_states:
                        state[car_position] = 1
                    
        except traci.exceptions.TraCIException:
            pass
        
        return state
    
    def _get_lane_group(self, lane_id: str) -> int:
        """
        Map lane ID to lane group index based on compass direction.
        """
        try:
            shape = self.connection.lane.getShape(lane_id)
            if len(shape) < 2: return -1
            
            # Vector from start to end
            x1, y1 = shape[-2]
            x2, y2 = shape[-1]
            dx = x2 - x1
            dy = y2 - y1
            
            # Determine main direction (N=1, E=2, S=3, W=4 approx)
            angle = np.degrees(np.arctan2(dy, dx)) % 360
            
            # Map angle to N/S/E/W
            direction = -1
            if 315 <= angle or angle < 45: # East incoming (Western arm) -> 0,1
                direction = 0 # "W2TL" equivalent
            elif 45 <= angle < 135: # North inbound (Southern arm going North) -> 6,7 (S2TL)
                direction = 6 # "S2TL"
            elif 135 <= angle < 225: # West inbound (Eastern arm) -> 4,5 (E2TL)
                direction = 4 # "E2TL"
            elif 225 <= angle < 315: # South inbound (Northern arm) -> 2,3 (N2TL)
                direction = 2 # "N2TL"
                
            if direction == -1: return -1
            
            # Check if left turn lane
            edge_id = self.connection.lane.getEdgeID(lane_id)
            num_lanes = self.connection.edge.getLaneNumber(edge_id)
            index = int(lane_id.split('_')[-1])
            
            is_left = (index == num_lanes - 1) and num_lanes > 1
            
            return direction + (1 if is_left else 0)
            
        except:
            return -1
    
    def _collect_waiting_times(self):
        """
        Collect waiting times for all vehicles in incoming lanes.
        """
        try:
            controlled_lanes = self.connection.trafficlight.getControlledLanes(self.tls_id)
            incoming_lanes = list(set(controlled_lanes))
            
            current_waiting_time = 0
            num_waiting_vehicles = 0
            
            for lane in incoming_lanes:
                vehicles = self.connection.lane.getLastStepVehicleIDs(lane)
                for car_id in vehicles:
                    wait_time = self.connection.vehicle.getAccumulatedWaitingTime(car_id)
                    if wait_time > 0:
                        current_waiting_time += wait_time
                        num_waiting_vehicles += 1
            
            self.total_waiting_time = current_waiting_time
            self.avg_waiting_time = self.total_waiting_time / num_waiting_vehicles if num_waiting_vehicles > 0 else 0
            
        except traci.exceptions.TraCIException:
            pass
    
    def get_lane_queue_lengths(self) -> Dict[str, int]:
        """
        Get queue length for each incoming lane.
        """
        queues = {}
        try:
            controlled_lanes = self.connection.trafficlight.getControlledLanes(self.tls_id)
            incoming_lanes = list(set(controlled_lanes))
            
            for lane in incoming_lanes:
                queues[lane] = self.connection.lane.getLastStepHaltingNumber(lane)
        except traci.exceptions.TraCIException:
            pass
        return queues

    def _get_queue_length(self) -> int:
        """
        Get total number of halted vehicles in incoming lanes.
        """
        queue_length = 0
        try:
            queues = self.get_lane_queue_lengths()
            queue_length = sum(queues.values())
        except traci.exceptions.TraCIException:
            pass
        return queue_length
    
    def _set_yellow_phase(self, old_phase: int):
        """
        Activate yellow phase for transition.
        Assumes standard SUMO pattern: Green(i) -> Yellow(i+1)
        """
        # Heuristic: try next phase index
        yellow_phase = old_phase + 1
        
        try:
            # Verify if valid
            max_phase = 0
            logics = self.connection.trafficlight.getAllProgramLogics(self.tls_id)
            if logics:
                max_phase = len(logics[0].phases) - 1
            
            if yellow_phase > max_phase:
                yellow_phase = 0 # Wrap around or handled by green set? 
                
            self.connection.trafficlight.setPhase(self.tls_id, yellow_phase)
        except traci.exceptions.TraCIException:
            pass
    
    def _set_green_phase_by_index(self, phase_index: int):
        """
        Activate specific phase index directly.
        """
        try:
            self.connection.trafficlight.setPhase(self.tls_id, phase_index)
        except traci.exceptions.TraCIException:
            pass

    def _set_green_phase(self, action: int):
        """
        Activate green phase based on Action Index (Legacy wrapper).
        """
        target = self.action_phase_map.get(action, 0)
        self._set_green_phase_by_index(target)
    
    def get_metrics(self) -> Dict:
        """
        Get performance metrics.
        
        Returns:
            Dictionary with all metrics
        """
        return {
            'avg_waiting_time': np.mean(self.metrics['waiting_time']) if self.metrics['waiting_time'] else 0,
            'avg_queue_length': np.mean(self.metrics['queue_length']) if self.metrics['queue_length'] else 0,
            'total_phase_changes': self.metrics['phase_changes'],
            'decisions': self.metrics['decisions']
        }
    
    def reset(self):
        """Reset agent state for new episode."""
        self.current_phase = 0
        self.time_since_last_change = 0
        self.waiting_times = {}
        self.total_waiting_time = 0
        self.queue_length = 0
        self.metrics = {
            'waiting_time': [],
            'queue_length': [],
            'throughput': 0,
            'phase_changes': 0,
            'decisions': []
        }
