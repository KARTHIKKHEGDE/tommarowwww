import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Users, Cpu, ShieldAlert, Activity, GitBranch, Radio } from 'lucide-react';
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

const ScenarioSelection = () => {
    const navigate = useNavigate();
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [loading, setLoading] = useState(true);
    const [initializing, setInitializing] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        fetchScenarios();
    }, []);

    const fetchScenarios = async () => {
        try {
            const response = await axios.get('/api/scenarios/list');
            // Ensure we only take what fits or handle it, but for now assuming 4 or 6 fits.
            // Requirement is "Single-screen grid layout".
            setScenarios(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch scenarios:', error);
            setLoading(false);
        }
    };

    const handleStartSimulation = async (id?: string) => {
        const targetId = id || selectedId;
        if (!targetId) return;
        setInitializing(true);
        try {
            await axios.post('/api/simulation/initialize', {
                scenario: targetId,
                max_steps: 5400,
                n_cars: 1000,
                gui: true,
                seed: 42
            });
            await axios.post('/api/simulation/start');
            navigate('/live');
        } catch (error) {
            console.error('Failed to start simulation:', error);
            alert('Simulation init failed. Check secure logs.');
        } finally {
            setInitializing(false);
        }
    };

    // Helper to get badge color styles
    const getBadgeStyle = (badge: string) => {
        switch (badge) {
            case 'CRITICAL': return 'text-red-500 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)] bg-red-900/10';
            case 'HIGH LOAD': return 'text-amber-500 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)] bg-amber-900/10';
            case 'REAL WORLD': return 'text-emerald-500 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)] bg-emerald-900/10';
            default: return 'text-cyan-500 border-cyan-500/50 bg-cyan-900/10';
        }
    };

    return (
        <div className="h-screen w-screen bg-[#0b0f14] text-white overflow-hidden relative font-mono selection:bg-cyan-500/30 selection:text-cyan-200">
            {/* Background Texture Layers */}
            <div className="absolute inset-0 bg-cyber-grid opacity-30 pointer-events-none" />
            <div className="absolute inset-0 scanline opacity-20 pointer-events-none" />
            <div className="scan-beam" />

            {/* Main Layout container - No Scroll */}
            <div className="h-full flex flex-col p-6 z-10 relative">

                {/* Header Bar */}
                <header className="flex items-center justify-between mb-6 border-b border-white/10 pb-4 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <h2 className="text-[10px] tracking-[0.2em] text-cyan-500/80 uppercase mb-1">Root Access // Secure // V.2.1</h2>
                            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                                <span className="w-2 h-8 bg-cyan-500 block shadow-[0_0_15px_var(--accent-cyan)]"></span>
                                SCENARIO SELECTION
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 px-4 py-1.5 border border-white/10 bg-black/40 text-xs">
                            <Radio className="w-3 h-3 text-red-500 animate-pulse" />
                            <span className="text-gray-400">NET_UPLINK:</span>
                            <span className="text-green-500">100%</span>
                        </div>
                    </div>
                </header>

                {/* Main Content Grid */}
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <Activity className="w-16 h-16 text-cyan-500 animate-bounce" />
                            <div className="text-cyan-500/80 text-sm animate-pulse tracking-widest">LOADING MODULES...</div>
                        </div>
                    </div>
                ) : scenarios.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-red-500/50">
                        <ShieldAlert className="w-16 h-16 mb-4 opacity-50" />
                        <div className="text-xl tracking-[0.5em] font-bold uppercase">System Offline</div>
                        <div className="text-xs text-gray-600 mt-2 font-mono">UNABLE TO ESTABLISH UPLINK WITH CORE</div>
                        <button
                            onClick={() => { setLoading(true); fetchScenarios(); }}
                            className="mt-8 px-6 py-2 border border-red-900/50 text-red-900/50 hover:bg-red-900/10 hover:text-red-500 hover:border-red-500 transition-colors uppercase text-xs tracking-widest"
                        >
                            Retry Connection
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 grid grid-cols-2 gap-6 min-h-0 overflow-y-auto pr-4 pb-6 scrollbar-thin scrollbar-thumb-cyan-900 scrollbar-track-transparent">
                        {scenarios.map((scenario) => (
                            <motion.div
                                key={scenario.id}
                                layoutId={scenario.id}
                                onClick={() => !initializing && setSelectedId(scenario.id)}
                                className={`
                                    relative flex flex-col border backdrop-blur-sm cursor-pointer transition-all duration-200 group
                                    ${selectedId === scenario.id
                                        ? 'bg-cyan-950/20 border-cyan-500/80 shadow-[0_0_50px_rgba(6,182,212,0.15)] z-20'
                                        : 'bg-[#0f1419]/80 border-white/10 hover:border-cyan-500/40 hover:bg-[#13181e]'
                                    }
                                `}
                            >
                                {/* Corners */}
                                <div className="cyber-card-corner corner-tl" />
                                <div className="cyber-card-corner corner-tr" />
                                <div className="cyber-card-corner corner-bl" />
                                <div className="cyber-card-corner corner-br" />

                                <div className="p-6 flex flex-col h-full relative overflow-hidden">
                                    {/* Background Tech Decode Effect */}
                                    <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/5 to-transparent pointer-events-none" />

                                    {/* Header Row */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <GitBranch className="w-3 h-3 text-cyan-500" />
                                            <span className="text-[10px] uppercase tracking-widest text-cyan-400">ID: {scenario.id}</span>
                                        </div>
                                        <div className={`px-2 py-1 text-[10px] font-bold border tracking-wider uppercase flex items-center gap-2 ${getBadgeStyle(scenario.badge)}`}>
                                            <ShieldAlert className="w-3 h-3" />
                                            {scenario.badge}
                                        </div>
                                    </div>

                                    {/* Main Title */}
                                    <h3 className={`text-2xl font-black uppercase mb-2 tracking-tight transition-colors ${selectedId === scenario.id ? 'text-white text-shadow-glow' : 'text-gray-200 group-hover:text-cyan-400'}`}>
                                        {scenario.name}
                                    </h3>

                                    {/* Description - Clamped */}
                                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-auto pr-8">
                                        {scenario.description}
                                    </p>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-2 my-5">
                                        <div className="flex items-center justify-between bg-black/40 border border-white/5 p-2 px-3">
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Complexity</span>
                                            <div className="flex items-center gap-2">
                                                <Cpu className="w-3 h-3 text-cyan-500" />
                                                <span className="text-xs font-bold text-cyan-100">{scenario.complexity}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between bg-black/40 border border-white/5 p-2 px-3">
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Agents</span>
                                            <div className="flex items-center gap-2">
                                                <Users className="w-3 h-3 text-cyan-500" />
                                                <span className="text-xs font-bold text-cyan-100">{scenario.agents}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Footer */}
                                    <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/10 group-hover:border-white/20 transition-colors">
                                        <div className="flex gap-2">
                                            {scenario.features.slice(0, 3).map((f, i) => (
                                                <span key={i} className="text-[9px] px-1.5 py-0.5 bg-white/5 text-gray-400 border border-white/5">{f}</span>
                                            ))}
                                        </div>

                                        {selectedId === scenario.id && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleStartSimulation(scenario.id);
                                                }}
                                                disabled={initializing}
                                                className={`
                                                    flex items-center gap-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-bold uppercase tracking-widest transition-all
                                                    shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]
                                                `}
                                            >
                                                {initializing ? <Activity className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                                                {initializing ? 'INIT_SEQ...' : 'INITIALIZE'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Global Overlay Vignette */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
        </div>
    );
};

export default ScenarioSelection;

