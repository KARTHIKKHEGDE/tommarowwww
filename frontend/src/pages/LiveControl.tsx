import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Power, Zap, Cpu, Server, Wifi, AlertTriangle, Play, ShieldAlert, Crosshair } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
interface AgentState {
    tls_id: string;
    current_phase: number;
    queue_length: number;
    time_since_change: number;
    emergency?: boolean;
    lane_queues?: Record<string, number>;
}

interface SimulationState {
    step: number;
    isRunning: boolean;
    rl_metrics: {
        waiting_time: number;
        queue_length: number;
        throughput: number;
    };
    fixed_metrics: {
        waiting_time: number;
        queue_length: number;
        throughput: number;
    };
    rl_details?: AgentState[];
}

// --- Components ---

const DigitalText = ({ value, label, color = "text-emerald-400" }: { value: string | number, label: string, color?: string }) => (
    <div className="flex flex-col font-mono tracking-wider">
        <span className={`text-[10px] uppercase opacity-60 ${color}`}>{label}</span>
        <span className={`text-xl font-bold ${color} tabular-nums leading-none`}>{value}</span>
    </div>
);

const PhaseRing = ({ phase, timer }: { phase: number, timer: number }) => {
    // Determine active quadrant based on phase (simplified mapping)
    // 0: NS, 1: NSL, 2: EW, 3: EWL
    const rotation = phase * 90;

    return (
        <div className="relative w-16 h-16 flex items-center justify-center">
            {/* Base Ring */}
            <svg className="w-full h-full absolute animate-[spin_10s_linear_infinite] opacity-30" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#00ff9c" strokeWidth="1" strokeDasharray="5,5" />
            </svg>

            {/* Active Segment */}
            <motion.svg
                className="w-full h-full absolute"
                viewBox="0 0 100 100"
                animate={{ rotate: rotation }}
                transition={{ type: "spring", stiffness: 50, damping: 15 }}
            >
                <circle cx="50" cy="50" r="40" fill="none" stroke="#00ff9c" strokeWidth="4" strokeDasharray="60, 190" strokeLinecap="butt" className="drop-shadow-[0_0_8px_rgba(0,255,156,0.8)]" />
            </motion.svg>

            {/* Timer Center */}
            <div className="text-[#00ff9c] font-bold text-lg font-mono z-10">{timer}s</div>
        </div>
    );
};

const LaneSensor = ({ id, load }: { id: string, load: number }) => {
    // Visual Load Bar
    const maxLoad = 20; // assumed max for visual scaling
    const intensity = Math.min(load / maxLoad, 1);
    const colorClass = intensity > 0.8 ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]";
    const widthPct = `${intensity * 100}%`;

    return (
        <div className="flex items-center gap-2 font-mono text-xs w-full mb-1">
            <span className="w-12 opacity-60 text-right shrink-0">{id.replace(/[-_]/g, '')}</span>
            <div className="flex-1 h-3 bg-emerald-900/20 relative border border-emerald-900/30 overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: widthPct }}
                    className={`h-full ${colorClass} opacity-80`}
                />
                {/* Micro-tick marks */}
                <div className="absolute inset-0 flex justify-between px-1 opacity-20 pointer-events-none">
                    {[...Array(5)].map((_, i) => <div key={i} className="w-[1px] h-full bg-emerald-500" />)}
                </div>
            </div>
            <span className="w-6 text-right tabular-nums">{load}</span>
        </div>
    );
};

const AINode = ({ agent }: { agent: AgentState }) => {
    const isEmergency = agent.emergency;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`relative bg-[#080a0c] border ${isEmergency ? 'border-red-500/60' : 'border-[#00ff9c]/30'} p-4 flex flex-col gap-4 overflow-hidden group hover:border-[#00ff9c]/60 transition-colors`}
        >
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_24%,rgba(0,255,156,0.03)_25%,rgba(0,255,156,0.03)_26%,transparent_27%,transparent_74%,rgba(0,255,156,0.03)_75%,rgba(0,255,156,0.03)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(0,255,156,0.03)_25%,rgba(0,255,156,0.03)_26%,transparent_27%,transparent_74%,rgba(0,255,156,0.03)_75%,rgba(0,255,156,0.03)_76%,transparent_77%,transparent)] bg-[length:30px_30px]" />
            {isEmergency && <div className="absolute inset-0 bg-red-500/5 animate-pulse" />}

            {/* Header */}
            <div className="flex justify-between items-start z-10 border-b border-[#00ff9c]/10 pb-2">
                <div className="flex flex-col">
                    <span className={`text-[10px] font-bold tracking-widest uppercase ${isEmergency ? 'text-red-500' : 'text-[#00ff9c]'}`}>Node_ID</span>
                    <span className="text-xl font-mono font-bold text-white tracking-wide flex items-center gap-2">
                        {agent.tls_id}
                        <span className={`w-2 h-2 rounded-full ${isEmergency ? 'bg-red-500 animate-ping' : 'bg-[#00ff9c] animate-pulse'}`} />
                    </span>
                </div>
                {isEmergency && (
                    <div className="px-2 py-1 border border-red-500 text-red-500 text-[10px] font-bold uppercase tracking-widest animate-pulse flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Override
                    </div>
                )}
            </div>

            {/* Core Stats */}
            <div className="grid grid-cols-[auto_1fr] gap-6 items-center z-10">
                <PhaseRing phase={agent.current_phase} timer={agent.time_since_change} />

                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <DigitalText value={agent.queue_length} label="Total Queue" color={agent.queue_length > 20 ? "text-amber-400" : undefined} />
                    <DigitalText value={agent.current_phase} label="Active Phase" />
                    <DigitalText value={(agent.time_since_change * 1.5).toFixed(0)} label="Throughput" color="text-cyan-400" />
                    <DigitalText value={isEmergency ? "ALERT" : "NOMINAL"} label="Status" color={isEmergency ? "text-red-500" : "text-emerald-600"} />
                </div>
            </div>

            {/* Sensor Data (Lanes) */}
            <div className="z-10 mt-2 bg-[#050607]/80 p-2 border border-[#00ff9c]/10 relative">
                <div className="text-[10px] uppercase text-[#00ff9c]/60 mb-2 flex justify-between items-center">
                    <span>Lane Sensor Array</span>
                    <Wifi className="w-3 h-3 opacity-40" />
                </div>
                <div className="max-h-24 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-emerald-900 scrollbar-track-black space-y-0.5">
                    {agent.lane_queues && Object.entries(agent.lane_queues).map(([lane, count]) => (
                        <LaneSensor key={lane} id={lane} load={count} />
                    ))}
                    {!agent.lane_queues && <div className="text-xs text-emerald-900 italic">No sensor data</div>}
                </div>
            </div>

            {/* Decor */}
            <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-[#00ff9c]/40" />
            <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-[#00ff9c]/40" />
        </motion.div>
    );
}

// --- Main Page ---

const LiveControl = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState<SimulationState>({
        step: 0,
        isRunning: false,
        rl_metrics: { waiting_time: 0, queue_length: 0, throughput: 0 },
        fixed_metrics: { waiting_time: 0, queue_length: 0, throughput: 0 }
    });
    const wsRef = useRef<WebSocket | null>(null);

    // Simulated scenario name - ideally this comes from context or API
    const scenarioName = "Just One Intersection";

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:8000/ws/simulation');
        ws.onopen = () => console.log('Link Established');
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setStatus(prev => ({ ...prev, ...data }));
        };
        wsRef.current = ws;
        return () => ws.close();
    }, []);

    const handleStop = async () => {
        try {
            await axios.post('/api/simulation/stop');
            setStatus(s => ({ ...s, isRunning: false }));
        } catch (error) {
            console.error('CMD FAIL:', error);
        }
    };

    return (
        <div className="h-screen w-screen bg-[#020202] text-[#e2e8f0] overflow-hidden flex flex-col font-mono selection:bg-[#00ff9c]/20">
            {/* 1. TOP COMMAND BAR */}
            <header className="h-12 border-b border-[#00ff9c]/20 bg-[#050505] flex items-center justify-between px-4 z-50">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/')}>
                        <Cpu className="w-5 h-5 text-[#00ff9c]" />
                        <span className="font-bold tracking-[0.2em] text-sm group-hover:text-[#00ff9c] transition-colors">TRAFFIC.AI_CORE</span>
                    </div>

                    <div className="h-4 w-px bg-[#00ff9c]/20" />

                    <div className="flex gap-4 text-[10px] uppercase tracking-wider text-[#00ff9c]/60">
                        <span className="flex items-center gap-1"><Server className="w-3 h-3" /> Node: LOCALHOST</span>
                        <span className="flex items-center gap-1"><Wifi className="w-3 h-3" /> Latency: 12ms</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-3 py-1 border ${status.isRunning ? 'border-[#00ff9c] bg-[#00ff9c]/10 text-[#00ff9c]' : 'border-gray-700 text-gray-500'} text-xs font-bold tracking-widest`}>
                        <div className={`w-2 h-2 rounded-full ${status.isRunning ? 'bg-[#00ff9c] animate-pulse' : 'bg-gray-500'}`} />
                        {status.isRunning ? 'SYSTEM :: ACTIVE' : 'SYSTEM :: STANDBY'}
                    </div>
                    <div className="text-[#00ff9c] font-bold text-xl tabular-nums tracking-widest w-24 text-right">
                        {(status.step * 0.1).toFixed(1)}s
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Background Grid & Noise */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,156,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,156,0.03)_1px,transparent_1px)] bg-[length:40px_40px] pointer-events-none opacity-50" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020202_90%)] pointer-events-none" />

                {/* 2. LEFT COMMAND STACK */}
                <aside className="w-72 bg-[#050505]/95 border-r border-[#00ff9c]/20 p-4 flex flex-col gap-6 z-40 backdrop-blur-sm relative">
                    {/* Header */}
                    <div className="border-b border-[#00ff9c]/20 pb-2 mb-2">
                        <h3 className="text-[#00ff9c] text-xs font-bold tracking-[0.3em] uppercase flex items-center gap-2">
                            <Crosshair className="w-4 h-4" /> Command_Stack
                        </h3>
                    </div>

                    {/* Scenario Control */}
                    <div className="bg-[#0a0a0a] border border-[#00ff9c]/20 p-3 relative group">
                        <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-2">Active Protocol</div>
                        <div className="text-[#00ff9c] font-bold text-sm mb-4">{scenarioName.toUpperCase()}</div>

                        {status.isRunning ? (
                            <button onClick={handleStop} className="w-full py-3 bg-red-500/10 border border-red-500/50 hover:bg-red-500 hover:text-black text-red-500 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                                <Power className="w-4 h-4" /> ABORT
                            </button>
                        ) : (
                            <button onClick={() => navigate('/scenarios')} className="w-full py-3 bg-[#00ff9c]/10 border border-[#00ff9c]/50 hover:bg-[#00ff9c] hover:text-black text-[#00ff9c] text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                                <Play className="w-4 h-4" /> INIT_SEQUENCE
                            </button>
                        )}

                        {/* Decorative corner */}
                        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#00ff9c] opacity-50" />
                        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#00ff9c] opacity-50" />
                    </div>



                    {/* Analytics Control */}
                    <div className="bg-[#0a0a0a] border border-[#00ff9c]/20 p-3 relative group hover:border-[#00ff9c]/50 transition-colors cursor-pointer" onClick={() => navigate('/analytics')}>
                        <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Post-Run Analytics</div>
                        <div className="text-[#00ff9c] font-bold text-xs uppercase tracking-widest flex items-center justify-between">
                            <span>View Dashboard</span>
                            <Activity className="w-4 h-4" />
                        </div>
                        {/* Decorative corner */}
                        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#00ff9c] opacity-30 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#00ff9c] opacity-30 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* System Parameters (Visual Only for now) */}
                    <div className="mt-auto space-y-3 opacity-60 pointer-events-none">
                        <div className="text-[9px] text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-1">Sys_Params</div>
                        <div className="flex justify-between text-[10px] text-[#00ff9c]"><span>Learn_Rate</span><span>0.001</span></div>
                        <div className="flex justify-between text-[10px] text-[#00ff9c]"><span>Gamma</span><span>0.95</span></div>
                        <div className="flex justify-between text-[10px] text-[#00ff9c]"><span>Batch_Size</span><span>64</span></div>
                    </div>
                </aside>

                {/* 3. MAIN CORE GRID */}
                <main className="flex-1 overflow-auto relative p-8">
                    {/* Standby State */}
                    {!status.isRunning && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                            <div className="flex flex-col items-center">
                                <div className="relative">
                                    <Activity className="w-32 h-32 text-[#00ff9c]/20 animate-pulse" />
                                    <div className="absolute inset-0 border-4 border-[#00ff9c]/10 rounded-full animate-[spin_10s_linear_infinite] border-t-[#00ff9c]/30" />
                                </div>
                                <h1 className="mt-8 text-3xl font-bold text-[#00ff9c] tracking-[0.4em] uppercase">Core_Standby</h1>
                                <p className="text-[#00ff9c]/50 text-sm font-mono mt-4 typewriter">Waiting for simulation initialization...</p>
                            </div>
                        </div>
                    )}

                    {/* Active Grid */}
                    <div className="max-w-[1600px] mx-auto">
                        <AnimatePresence>
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                                {status.rl_details && status.rl_details.map((agent) => (
                                    <AINode key={agent.tls_id} agent={agent} />
                                ))}
                            </div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default LiveControl;
