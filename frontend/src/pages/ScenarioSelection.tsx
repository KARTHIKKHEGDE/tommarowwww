import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ShieldAlert, Activity, Terminal, Zap, Lock, AlertTriangle } from 'lucide-react';
import axios from 'axios';

interface Scenario {
    id: string;
    name: string;
    code: string;
    complexity: string;
    agents: string;
    description: string;
    badge: string;
    features: string[];
}

const systemMetadata: Record<string, any> = {
    'single': {
        node: 'SINGLE_JUNCTION',
        mode: 'ISOLATED CONTROL',
        risk: 'LOW',
        load: '8%',
        estimate: '00:15',
        priority: 'STANDARD',
        color: '#00f7ff',
        agents_count: '1',
        expected_vph: '850',
        avg_queue_len: '45m',
        primary_roads: ['Main Alpha', 'Cross Beta'],
        junction_type: '4-Way Standard'
    },
    'grid': {
        node: 'URBAN_GRID',
        mode: 'DISTRIBUTED CONTROL',
        risk: 'MEDIUM',
        load: '42%',
        estimate: '01:20',
        priority: 'Grid like Roads',
        color: '#ffaa00',
        agents_count: '12-15',
        expected_vph: '2,800',
        avg_queue_len: '120m',
        primary_roads: ['Sector 1-9 Network'],
        junction_type: 'Mesh Grid'
    },
    'bangalore_hosmat': {
        node: 'HOSMAT_ZONE',
        mode: 'TRAFFIC STRESS ANALYSIS',
        risk: 'HIGH',
        load: '78%',
        estimate: '02:45',
        priority: 'NETWORK',
        color: '#ff004c',
        agents_count: '1 (Complex)',
        expected_vph: '3,450',
        avg_queue_len: '420m',
        primary_roads: ['Magrath Road', 'Richmond Road', 'Hosmat Hospital Junction'],
        junction_type: 'Multi-Leg Signal'
    },
    'bangalore_hebbal': {
        node: 'HEBBAL_SERVICE',
        mode: 'HEAVY FLOW',
        risk: 'CRITICAL',
        load: '95%',
        estimate: '03:10',
        priority: 'SEVERE_CONGESTION',
        color: '#ff004c',
        agents_count: '4 Sub-Nodes',
        expected_vph: '5,800+',
        avg_queue_len: '1,150m',
        primary_roads: ['Outer Ring Road', 'Airport Road Flyover', 'Hebbal Service Road'],
        junction_type: 'High-Density Interchange'
    },
    'bangalore_jss': {
        node: 'JSS_INTERSECTION',
        mode: 'STOCHASTIC_FLOW',
        risk: 'HIGH',
        load: '64%',
        estimate: '02:15',
        priority: 'URBAN_CORE',
        color: '#00ff9c',
        agents_count: '1',
        expected_vph: '2,100',
        avg_queue_len: '280m',
        primary_roads: ['Jayanagar 4th Block', 'JSS Main Road'],
        junction_type: 'T-Junction Priority'
    }
};

const ScenarioSelection = () => {
    const navigate = useNavigate();
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [loading, setLoading] = useState(true);
    const [initializing, setInitializing] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    useEffect(() => {
        fetchScenarios();
    }, []);

    const fetchScenarios = async () => {
        try {
            const response = await axios.get('/api/scenarios/list');
            setScenarios(response.data);
            if (response.data.length > 0) {
                // Check if there's a priority order or just take the first
                setSelectedId(response.data[0].id);
            }
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch scenarios:', error);
            setLoading(false);
        }
    };

    const handleStartSimulation = async (id: string) => {
        setInitializing(true);
        try {
            const initRes = await axios.post('/api/simulation/initialize', {
                scenario: id,
                max_steps: 5400,
                n_cars: 1000,
                gui: true,
                seed: 42
            });

            if (initRes.data.tls_ids) {
                localStorage.setItem('active_tls_ids', JSON.stringify(initRes.data.tls_ids));
            }

            await axios.post('/api/simulation/start');
            navigate('/live');
        } catch (error) {
            console.error('Failed to start simulation:', error);
            alert('Simulation init failed. Check secure logs.');
        } finally {
            setInitializing(false);
        }
    };

    const activeScenario = scenarios.find(s => s.id === selectedId);
    const meta = systemMetadata[activeScenario?.id || ''] || systemMetadata['single'];

    return (
        <div className="h-screen w-screen bg-cyber-layers text-white overflow-hidden relative font-mono selection:bg-cyan-500/30 selection:text-cyan-200">
            {/* Background Texture Layers */}
            <div className="bg-noise absolute inset-0 z-0" />
            <div className="scan-sweep z-0" />

            {/* Left Telemetry Rail */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-white/5 z-0" />

            {/* Main Layout container */}
            <div className="h-full flex flex-col p-6 z-10 relative">

                {/* Global Header */}
                <header className="flex items-center justify-between mb-8 shrink-0 border-b border-white/5 pb-4">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="w-2 h-2 bg-cyan-500 animate-pulse" />
                            <h2 className="text-[10px] tracking-[0.4em] text-cyan-400 font-bold uppercase">System_Deployment // Scenario_Matrix</h2>
                        </div>
                        <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">
                            Operational_Environment_Selection
                        </h1>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <div className="text-[9px] text-gray-500 uppercase tracking-widest">Auth_Level</div>
                            <div className="text-xs font-bold text-red-500 flex items-center justify-end gap-2">
                                <Lock className="w-3 h-3" />
                                ROOT_ACCESS_REQUIRED
                            </div>
                        </div>
                        <div className="bg-black/80 border border-white/10 px-4 py-2 flex items-center gap-3">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[10px] text-emerald-400 font-black tracking-widest uppercase">Uplink_Stable</span>
                        </div>
                    </div>
                </header>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Activity className="w-12 h-12 text-cyan-500 animate-spin" />
                    </div>
                ) : (
                    <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
                        {/* LEFT COLUMN: SCENARIO INDEX */}
                        <div className="w-80 flex flex-col gap-3 overflow-y-auto pr-2 scrollbar-hide">
                            <div className="text-[10px] text-gray-600 font-black uppercase mb-2 flex items-center gap-2">
                                <Terminal className="w-3 h-3" /> System_Index
                            </div>
                            {scenarios.map((scenario) => (
                                <motion.div
                                    key={scenario.id}
                                    onMouseEnter={() => setHoveredId(scenario.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                    onClick={() => setSelectedId(scenario.id)}
                                    className={`
                                        cyber-module p-4 cursor-pointer transition-all duration-300 group
                                        ${selectedId === scenario.id
                                            ? 'bg-cyan-500 color-[#000] shadow-[0_0_20px_rgba(0,247,255,0.4)]'
                                            : 'bg-black/60 border border-cyan-400/40 hover:border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.05)] hover:shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                                        }
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[9px] font-black tracking-widest ${selectedId === scenario.id ? 'text-black' : 'text-cyan-500'}`}>
                                            NODE: {systemMetadata[scenario.id]?.node || 'UNK'}
                                        </span>
                                        {selectedId === scenario.id && <Zap className="w-3 h-3 text-black animate-pulse" />}
                                    </div>
                                    <h3 className={`text-sm font-black uppercase tracking-tight ${selectedId === scenario.id ? 'text-black' : 'text-white'}`}>
                                        {scenario.name.split('-')[0].trim()}
                                    </h3>
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className={`h-1 flex-1 bg-white/10`}>
                                            <motion.div
                                                className={`h-full ${selectedId === scenario.id ? 'bg-black' : 'bg-cyan-500'}`}
                                                initial={{ width: 0 }}
                                                animate={{ width: systemMetadata[scenario.id]?.load || '10%' }}
                                            />
                                        </div>
                                        <span className={`text-[8px] font-bold ${selectedId === scenario.id ? 'text-black' : 'text-gray-500'}`}>
                                            {systemMetadata[scenario.id]?.load || '0%'}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* CENTER COLUMN: SELECTED SCENARIO (DOMINANT) */}
                        <div className="flex-1 flex flex-col gap-6">
                            <AnimatePresence mode="wait">
                                {activeScenario && (
                                    <motion.div
                                        key={activeScenario.id}
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 1.02 }}
                                        className="flex-1 flex flex-col cyber-module bg-black/40 border-2 border-cyan-400/40 relative overflow-hidden group border-scan shadow-[0_0_30px_rgba(34,211,238,0.1)]"
                                    >
                                        {/* Background Deco */}
                                        <div className="absolute inset-0 diagonal-stripes opacity-10 pointer-events-none" />
                                        <div className="absolute inset-0 circuit-pattern opacity-5 pointer-events-none" />

                                        <div className="p-10 flex flex-col h-full relative z-10">
                                            {/* Top Banner */}
                                            <div className="flex justify-between items-start mb-8">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="px-2 py-0.5 bg-red-500 text-black text-[9px] font-black uppercase tracking-[0.2em]">Live_Operational</span>
                                                        <span className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase italic">Encryption: AES-256 Enabled</span>
                                                    </div>
                                                    <h2 className="text-6xl font-black uppercase text-white tracking-tighter leading-none">
                                                        {activeScenario.name}
                                                    </h2>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Security_Clearance</div>
                                                    <div className="px-4 py-1 border border-red-500/50 text-red-500 text-[10px] font-black uppercase">
                                                        ADMIN_ONLY
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Large Description */}
                                            <p className="text-gray-400 text-lg leading-relaxed max-w-2xl mb-10 italic">
                                                {activeScenario.description}
                                            </p>

                                            {/* Technical parameters Grid */}
                                            <div className="grid grid-cols-3 gap-6 mb-10">
                                                <div className="bg-white/2 border border-cyan-400/40 border-l-2 border-l-cyan-500 p-4 shadow-[inset_0_0_15px_rgba(34,211,238,0.02)]">
                                                    <div className="text-[9px] text-cyan-500 font-black uppercase tracking-widest mb-1">Access_Mode</div>
                                                    <div className="text-xl font-black text-white">{meta.mode}</div>
                                                </div>
                                                <div className="bg-white/2 border border-cyan-400/40 border-l-2 border-l-amber-500 p-4 shadow-[inset_0_0_15px_rgba(251,191,36,0.02)]">
                                                    <div className="text-[9px] text-amber-500 font-black uppercase tracking-widest mb-1">Threat_Level</div>
                                                    <div className="text-xl font-black text-white uppercase">{meta.risk}</div>
                                                </div>
                                                <div className="bg-white/2 border border-cyan-400/40 border-l-2 border-l-primary p-4 shadow-[inset_0_0_15px_rgba(34,211,238,0.02)]">
                                                    <div className="text-[9px] text-cyan-400 font-black uppercase tracking-widest mb-1">Node_Priority</div>
                                                    <div className="text-xl font-black text-white uppercase">{meta.priority}</div>
                                                </div>
                                            </div>

                                            {/* Warnings / Cues */}
                                            {/* Warnings / Action Footer */}
                                            <div className="mt-auto flex items-stretch justify-between gap-6 h-20">
                                                <div className="flex flex-1 items-stretch gap-4">
                                                    <div className="flex-1 flex items-center gap-3 bg-red-500/10 border border-cyan-400/40 px-4 py-3 shadow-[0_0_10px_rgba(34,211,238,0.05)]">
                                                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                                                        <div>
                                                            <div className="text-[8px] text-red-400 font-black uppercase tracking-widest">Caution</div>
                                                            <div className="text-[9px] text-white/80 font-bold leading-tight">REAL-WORLD IMPACT</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 flex items-center gap-3 bg-amber-500/10 border border-cyan-400/40 px-4 py-3 shadow-[0_0_10px_rgba(34,211,238,0.05)]">
                                                        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
                                                        <div>
                                                            <div className="text-[8px] text-amber-400 font-black uppercase tracking-widest">Protocol</div>
                                                            <div className="text-[9px] text-white/80 font-bold leading-tight">SIM LOCKED AFTER START</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleStartSimulation(activeScenario.id)}
                                                    className="btn-cyber flex-1 px-8 group overflow-hidden"
                                                    disabled={initializing}
                                                >
                                                    <div className="flex items-center gap-4 relative z-10 w-full justify-center">
                                                        {initializing ? (
                                                            <Activity className="w-6 h-6 animate-spin" />
                                                        ) : (
                                                            <Play className="w-6 h-6 group-hover:scale-110 transition-transform fill-cyan-500/20" />
                                                        )}
                                                        <div className="text-left">
                                                            <div className="text-[8px] text-cyan-400 group-hover:text-black font-black tracking-[0.3em] uppercase opacity-70">Execute_Deploy</div>
                                                            <div className="text-xl font-black leading-none truncate">
                                                                {initializing ? 'LOADING...' : 'DEPLOY_SCENARIO'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* RIGHT COLUMN: SYSTEM MONITOR */}
                        <div className="w-72 flex flex-col gap-6">
                            <div className="cyber-module bg-black/60 border border-cyan-400/50 p-6 flex-1 shadow-[0_0_20px_rgba(34,211,238,0.05)] overflow-y-auto scrollbar-hide">
                                <div className="text-[10px] text-cyan-500 font-black uppercase mb-6 flex items-center justify-between">
                                    <span>[SCENARIO_STATS]</span>
                                    <span className="animate-pulse">ANALYZING</span>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-2">Deployed_Agents</div>
                                        <div className="text-xl font-black text-white">{meta.agents_count}</div>
                                        <div className="text-[8px] text-cyan-600 font-bold mt-1 tracking-tighter uppercase">Parallel Controllers Online</div>
                                    </div>

                                    <div>
                                        <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-2">Traffic_Volume (VPH)</div>
                                        <div className="text-xl font-black text-white">{meta.expected_vph}</div>
                                        <div className="w-full bg-white/5 h-1 mt-2 relative">
                                            <motion.div
                                                className="absolute inset-y-0 left-0 bg-red-500"
                                                initial={{ width: 0 }}
                                                animate={{ width: meta.load }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-2">Avg_Queue_Depth</div>
                                        <div className="text-xl font-black text-white">{meta.avg_queue_len}</div>
                                        <div className="text-[8px] text-amber-500 font-bold mt-1 tracking-tighter uppercase">Pressure Threshold Critical</div>
                                    </div>

                                    <div className="pt-6 border-t border-white/5">
                                        <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-3">Linked_Infrastructure</div>
                                        <div className="space-y-3">
                                            {meta.primary_roads.map((road: string, idx: number) => (
                                                <div key={idx} className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1 h-1 bg-cyan-400" />
                                                        <span className="text-[9px] font-black text-white/80 uppercase truncate">{road}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center mt-1">
                                                        <span className="text-[7px] text-gray-600">QUEUE_WEIGHT</span>
                                                        <span className="text-[7px] text-cyan-500 font-bold">{Math.floor(Math.random() * 40 + 40)}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/5">
                                        <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-2">System_Profile</div>
                                        <div className="bg-black/40 border border-white/5 p-2 flex flex-col gap-1">
                                            <div className="flex justify-between">
                                                <span className="text-[8px] text-gray-500">TYPE:</span>
                                                <span className="text-[8px] text-white font-bold">{meta.junction_type}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-[8px] text-gray-500">LATENCY:</span>
                                                <span className="text-[8px] text-emerald-500 font-bold">14ms</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-[8px] text-gray-500">PROTOCOL:</span>
                                                <span className="text-[8px] text-white font-bold">TRACI/TCP</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-red-500/5 border border-cyan-400/40 p-4 cyber-module shadow-[0_0_10px_rgba(34,211,238,0.05)]">
                                <div className="flex items-center gap-3 text-red-500 mb-2">
                                    <ShieldAlert className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Notice</span>
                                </div>
                                <p className="text-[8px] text-red-300 font-bold leading-tight uppercase">
                                    Deployment log: simulation_id_{Math.floor(Math.random() * 9000 + 1000)} initiated. All state transitions recorded.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Global Footer Overlay */}
            <div className="absolute bottom-4 left-6 text-[8px] text-gray-700 tracking-[0.4em] uppercase font-black pointer-events-none z-20">
                Secure_Link // Protocol_v4.2 // RSA_Encrypted
            </div>

            {/* Global Overlay Vignette */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] z-10" />
        </div>
    );
};

export default ScenarioSelection;
