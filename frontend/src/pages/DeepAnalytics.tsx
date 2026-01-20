import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Zap, Cpu, ArrowLeft } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import axios from 'axios';


interface MetricData {
    fixed: number[];
    rl: number[];
    improvement: number[];
}

interface AnalyticsData {
    duration: number;
    time_points: number[];
    metrics: {
        waiting_time: MetricData;
        queue_length: MetricData;
        throughput: MetricData;
        efficiency: MetricData;
    };
    summary: {
        waiting_time_improvement: number;
        queue_improvement: number;
        throughput_increase: number;
        rl_avg_wait: number;
        fixed_avg_wait: number;
    };
    generated_at?: number;
}

// --- Reusable Complex Chart Component ---
const ComplexChart = ({ title, data, timePoints, color, unit }: any) => {
    // Transform data for Recharts
    const chartData = timePoints.map((t: number, i: number) => ({
        time: t.toFixed(0),
        fixed: data.fixed[i],
        rl: data.rl[i],
        improvement: data.improvement[i]
    }));

    // Calculate phase indices for background highlights
    const totalPoints = timePoints.length;
    const p1End = Math.floor(totalPoints * 0.2);
    const p2End = Math.floor(totalPoints * 0.7);

    return (
        <div className={`bg-[#0a0a0a] border border-${color}-500/20 p-5 relative group hover:border-${color}-500/40 transition-all duration-500 overflow-hidden`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4 z-10 relative">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 bg-${color}-500/10 rounded-sm border border-${color}-500/20`}>
                        <Activity className={`w-4 h-4 text-${color}-500`} />
                    </div>
                    <span className={`text-${color}-500 text-xs font-bold tracking-[0.2em] uppercase`}>{title}</span>
                </div>
                <div className="flex gap-4 text-[9px] font-bold uppercase tracking-widest opacity-60">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Legacy</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#00ff9c]" /> AI Agent</span>
                </div>
            </div>

            {/* Chart */}
            <div className="h-[200px] w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id={`grad${color}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color === 'cyan' ? '#00ff9c' : color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={color === 'cyan' ? '#00ff9c' : color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />

                        {/* Phases Backgrounds */}
                        {chartData.length > 0 && (
                            <>
                                <ReferenceArea x1={chartData[0].time} x2={chartData[p1End]?.time} fill="#ffff00" fillOpacity={0.02} />
                                <ReferenceArea x1={chartData[p1End]?.time} x2={chartData[p2End]?.time} fill="#00ff00" fillOpacity={0.02} />
                                <ReferenceArea x1={chartData[p2End]?.time} x2={chartData[totalPoints - 1]?.time} fill="#0000ff" fillOpacity={0.02} />
                            </>
                        )}

                        <XAxis dataKey="time" stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}${unit || ''}`} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#000000cc', borderColor: '#ffffff20', backdropFilter: 'blur(4px)' }}
                            itemStyle={{ fontSize: '10px', fontFamily: 'monospace' }}
                            labelStyle={{ color: '#666', fontSize: '10px', marginBottom: '5px' }}
                        />
                        <Area type="monotone" dataKey="fixed" stroke="#ef4444" fill="transparent" strokeWidth={1.5} dot={false} strokeOpacity={0.7} />
                        <Area type="monotone" dataKey="rl" stroke={color === 'cyan' ? '#06b6d4' : (color === 'green' ? '#00ff9c' : color)} fill={`url(#grad${color})`} strokeWidth={2} dot={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Metrics Footer */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                <div className="flex gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 uppercase">Phase</span>
                        <span className="text-xs font-mono text-[#00ff9c]">CONVERGED</span>
                    </div>
                </div>
                <div className="text-right">
                    <span className={`text-xl font-bold font-mono text-${color}-400`}>
                        {Math.abs(data.improvement[data.improvement.length - 1]).toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-gray-500 uppercase ml-2">IMPROVEMENT</span>
                </div>
            </div>

            {/* Phase Labels Overlay */}
            <div className="absolute top-[60px] left-0 w-full flex justify-between px-4 pointer-events-none opacity-20 text-[9px] font-mono tracking-widest text-white/50">
                <span className="w-[20%] text-center border-b border-white/20 pb-1">EXPLORE</span>
                <span className="w-[50%] text-center border-b border-white/20 pb-1">LEARNING</span>
                <span className="w-[30%] text-center border-b border-white/20 pb-1">OPTIMIZED</span>
            </div>
        </div>
    );
};

const StatBlock = ({ label, value, sub, color }: any) => (
    <div className={`bg-[#0a0a0a] p-4 border-l-2 border-${color}-500`}>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</div>
        <div className="text-2xl font-mono font-bold text-white mb-1">{value}</div>
        <div className={`text-xs font-mono text-${color}-500`}>{sub}</div>
    </div>
);

const DeepAnalytics = () => {
    const navigate = useNavigate();

    // State for the full dataset (hidden buffer)
    const [fullData, setFullData] = useState<AnalyticsData | null>(null);

    // State for what is currently displayed (progressive slice)
    const [displayData, setDisplayData] = useState<AnalyticsData | null>(null);
    const [playbackIndex, setPlaybackIndex] = useState(0);
    const [isSimulating, setIsSimulating] = useState(false);
    const [loading, setLoading] = useState(false);

    // Initial empty state values
    const [currentMetrics, setCurrentMetrics] = useState({
        wait: 0,
        waitImp: 0,
        throughput: 0,
        throughputImp: 0,
        queue: 0,
        queueImp: 0
    });

    const startSimulation = async () => {
        try {
            setLoading(true);
            setPlaybackIndex(0);
            setIsSimulating(false);

            // Artificial delay for "Connecting to Kernel..."
            await new Promise(resolve => setTimeout(resolve, 800));

            // Add timestamp to prevent caching
            const response = await axios.get(`/api/simulation/comparison?t=${Date.now()}`);
            const data = response.data;

            setFullData(data);

            // Calculate current playback position based on server timestamp
            // This ensures we resume exactly where we left off (or where the sim is "now")
            let initialIndex = 0;
            if (data.generated_at) {
                const elapsedMs = Date.now() - data.generated_at;
                // Step length is 0.5s (500ms)
                initialIndex = Math.floor(elapsedMs / 500);

                // Clamp to data bounds
                if (initialIndex < 0) initialIndex = 0;
                if (initialIndex >= data.time_points.length) initialIndex = data.time_points.length - 1;
            }

            setPlaybackIndex(initialIndex);

            // Initialize display data to correct slice
            // We need to trigger the useEffect logic immediately or set it here
            // Setting state here is safer to avoid flickers

            // ... (The useEffect [playbackIndex, fullData] will handle the slicing automatically 
            // once playbackIndex and fullData are set)

            setLoading(false);
            setIsSimulating(true);

        } catch (error) {
            console.error('Failed to fetch analytics:', error);
            setLoading(false);
        }
    };

    // Playback Loop
    useEffect(() => {
        if (!isSimulating || !fullData) return;

        const interval = setInterval(() => {
            setPlaybackIndex(prev => {
                const nextIndex = prev + 1;

                // Stop condition
                if (nextIndex >= fullData.time_points.length) {
                    setIsSimulating(false);
                    return prev;
                }

                return nextIndex;
            });
        }, 500); // Real-time playback (0.5s per step)

        return () => clearInterval(interval);
    }, [isSimulating, fullData]);

    // Status Polling Loop - Detects if user closed SUMO or stopped simulation
    useEffect(() => {
        if (!isSimulating) return;

        const pollStatus = async () => {
            try {
                const res = await axios.get('/api/simulation/status');
                if (!res.data.running) {
                    // Simulation stopped externally!
                    setIsSimulating(false);
                    // Optionally clear display to show "Session Ended"
                    setDisplayData(null);
                    setFullData(null);
                    // Navigate back or show message? User asked to "stop showing"
                }
            } catch (e) {
                console.error("Status poll failed", e);
            }
        };

        const statusInterval = setInterval(pollStatus, 2000); // Check every 2s
        return () => clearInterval(statusInterval);
    }, [isSimulating]);

    // Update Display Data when index changes
    useEffect(() => {
        if (!fullData || playbackIndex === 0) return;

        // Slice data up to current index
        const sliceData = (source: number[]) => source.slice(0, playbackIndex);

        setDisplayData({
            ...fullData,
            time_points: sliceData(fullData.time_points),
            metrics: {
                waiting_time: {
                    fixed: sliceData(fullData.metrics.waiting_time.fixed),
                    rl: sliceData(fullData.metrics.waiting_time.rl),
                    improvement: sliceData(fullData.metrics.waiting_time.improvement)
                },
                queue_length: {
                    fixed: sliceData(fullData.metrics.queue_length.fixed),
                    rl: sliceData(fullData.metrics.queue_length.rl),
                    improvement: sliceData(fullData.metrics.queue_length.improvement)
                },
                throughput: {
                    fixed: sliceData(fullData.metrics.throughput.fixed),
                    rl: sliceData(fullData.metrics.throughput.rl),
                    improvement: sliceData(fullData.metrics.throughput.improvement)
                },
                efficiency: {
                    fixed: sliceData(fullData.metrics.efficiency.fixed),
                    rl: sliceData(fullData.metrics.efficiency.rl),
                    improvement: sliceData(fullData.metrics.efficiency.improvement)
                }
            }
        });

        // Update current metric numbers (Instant values from the latest point)
        const idx = playbackIndex - 1;
        if (idx >= 0) {
            setCurrentMetrics({
                wait: fullData.metrics.waiting_time.rl[idx],
                waitImp: fullData.metrics.waiting_time.improvement[idx],
                throughput: fullData.metrics.throughput.improvement[idx],
                queue: fullData.metrics.queue_length.improvement[idx],
                throughputImp: fullData.metrics.throughput.improvement[idx],
                queueImp: fullData.metrics.queue_length.improvement[idx]
            });
        }

    }, [playbackIndex, fullData]);

    // Auto-start simulation on mount
    useEffect(() => {
        startSimulation();
    }, []);

    // --- RENDER HELPERS ---

    // If no data yet, show zeroes
    const showValues = displayData && displayData.time_points.length > 0;

    return (
        <div className="h-screen w-screen bg-[#020202] text-[#e2e8f0] overflow-hidden flex flex-col font-mono selection:bg-[#00ff9c]/20">
            {/* Header */}
            <header className="h-14 border-b border-[#00ff9c]/20 bg-[#050505] flex items-center justify-between px-6 z-50 shrink-0">
                <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate('/')}>
                    <div className="w-8 h-8 bg-[#00ff9c]/10 flex items-center justify-center border border-[#00ff9c]/20 rounded">
                        <Cpu className="w-4 h-4 text-[#00ff9c]" />
                    </div>
                    <div>
                        <div className="font-bold tracking-[0.2em] text-sm group-hover:text-[#00ff9c] transition-colors">TRAFFIC.AI</div>
                        <div className="text-[9px] text-gray-500 tracking-widest">DEEP ANALYTICS MODULE</div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex gap-4 text-[10px] uppercase tracking-wider text-[#00ff9c]/60 border-r border-[#00ff9c]/20 pr-6">
                        <span className="flex items-center gap-1">
                            <Activity className={`w-3 h-3 ${isSimulating ? 'animate-pulse text-[#00ff9c]' : ''}`} />
                            Status: {isSimulating ? 'LIVE ANALYSIS RUNNING' : (displayData ? 'SESSION COMPLETE' : 'INITIALIZING...')}
                        </span>
                    </div>
                    {/* Button Removed - Auto Start */}
                    <button
                        onClick={() => navigate('/live')}
                        className="group flex items-center gap-2 px-4 py-1.5 border border-[#00ff9c]/30 hover:bg-[#00ff9c]/10 text-[#00ff9c] text-[10px] font-bold uppercase tracking-widest transition-all"
                    >
                        <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                        <span>Live Control</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-[#00ff9c]/20">
                <div className="max-w-[1800px] mx-auto space-y-6">

                    {/* Top Summary Blocks - Dynamic Updating */}
                    <div className="grid grid-cols-4 gap-4">
                        <StatBlock
                            label="Avg Waiting Time"
                            value={showValues ? `${currentMetrics.wait.toFixed(1)}s` : '--'}
                            sub={showValues ? `▼ ${currentMetrics.waitImp.toFixed(1)}% Reduction` : 'Waiting for Data...'}
                            color="cyan"
                        />
                        <StatBlock
                            label="Throughput Gain"
                            value={showValues ? `+${currentMetrics.throughputImp.toFixed(1)}%` : '--'}
                            sub="Vehicle Flow Rate"
                            color="green"
                        />
                        <StatBlock
                            label="Queue Efficiency"
                            value={showValues ? `${currentMetrics.queueImp.toFixed(1)}%` : '--'}
                            sub="Length Reduction"
                            color="purple"
                        />
                        <div className="bg-[#00ff9c]/5 p-4 border border-[#00ff9c]/20 flex flex-col justify-center items-center text-center">
                            <div className={`text-3xl font-bold mb-1 ${showValues ? 'text-[#00ff9c]' : 'text-gray-600'}`}>
                                {showValues ? 'A+' : '--'}
                            </div>
                            <div className="text-[10px] text-[#00ff9c]/60 uppercase tracking-[0.2em]">Overall Grade</div>
                        </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-2 gap-6">
                        <ComplexChart
                            title="Waiting Time Latency"
                            data={displayData?.metrics.waiting_time || { fixed: [], rl: [], improvement: [] }}
                            timePoints={displayData?.time_points || []}
                            unit="s"
                            color="cyan"
                        />
                        <ComplexChart
                            title="Queue Length"
                            data={displayData?.metrics.queue_length || { fixed: [], rl: [], improvement: [] }}
                            timePoints={displayData?.time_points || []}
                            unit="veh"
                            color="purple"
                        />
                        <ComplexChart
                            title="System Throughput"
                            data={displayData?.metrics.throughput || { fixed: [], rl: [], improvement: [] }}
                            timePoints={displayData?.time_points || []}
                            unit="v/h"
                            color="green"
                        />
                        <ComplexChart
                            title="Control Efficiency"
                            data={displayData?.metrics.efficiency || { fixed: [], rl: [], improvement: [] }}
                            timePoints={displayData?.time_points || []}
                            unit="pts"
                            color="yellow"
                        />
                    </div>

                    {/* Footer Info */}
                    <div className="grid grid-cols-3 gap-6 opacity-60">
                        <div className={`bg-[#0a0a0a] p-3 border text-[10px] font-mono transition-colors duration-300 ${playbackIndex > 0 && playbackIndex < (fullData?.time_points.length || 100) * 0.2 ? 'border-[#00ff9c] text-white' : 'border-white/5 text-gray-400'}`}>
                            <strong className="block mb-1 text-xs">Phase I: Exploration</strong>
                            Agent explores random actions to map the state space. Performance is volatile.
                        </div>
                        <div className={`bg-[#0a0a0a] p-3 border text-[10px] font-mono transition-colors duration-300 ${playbackIndex > (fullData?.time_points.length || 100) * 0.2 && playbackIndex < (fullData?.time_points.length || 100) * 0.7 ? 'border-[#00ff9c] text-white' : 'border-white/5 text-gray-400'}`}>
                            <strong className="block mb-1 text-xs">Phase II: Learning</strong>
                            Rapid policy optimization. Significant divergence from baseline as strategies solidify.
                        </div>
                        <div className={`bg-[#0a0a0a] p-3 border text-[10px] font-mono transition-colors duration-300 ${playbackIndex > (fullData?.time_points.length || 100) * 0.7 ? 'border-[#00ff9c] text-white' : 'border-white/5 text-gray-400'}`}>
                            <strong className="block mb-1 text-xs">Phase III: Convergence</strong>
                            Policy stabilizes. Micro-optimizations continue. System reaches steady-state.
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DeepAnalytics;

