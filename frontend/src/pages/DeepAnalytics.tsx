import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, BarChart2, Clock, Zap, Cpu, Server, Wifi, ShieldAlert, Play, ArrowLeft, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import axios from 'axios';
import { motion } from 'framer-motion';

interface ComparisonMetrics {
    rl: {
        avg_waiting_time: number;
        avg_queue_length: number;
        total_throughput: number;
    };
    fixed: {
        avg_waiting_time: number;
        avg_queue_length: number;
        total_throughput: number;
    };
    improvement: {
        waiting_time_reduction: number;
        queue_length_reduction: number;
        throughput_increase: number;
    };
    time_series: {
        rl_waiting: number[];
        fixed_waiting: number[];
        rl_queue: number[];
        fixed_queue: number[];
    };
}

// --- Components ---

const StatCard = ({ label, fixed, rl, unit, improvement, better, color, index }: any) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`
                bg-[#0a0a0a] border border-[#00ff9c]/20 p-4 relative group hover:border-[#00ff9c]/50 transition-colors
                before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-${color}-500 before:opacity-50 before:transition-opacity hover:before:opacity-100
            `}
        >
            <div className={`flex items-center gap-2 mb-4 text-[10px] font-bold text-${color}-400 uppercase tracking-[0.2em] opacity-80`}>
                {index === 0 && <Clock className="w-3 h-3" />}
                {index === 1 && <Zap className="w-3 h-3" />}
                {index === 2 && <ShieldAlert className="w-3 h-3" />}
                {index === 3 && <Activity className="w-3 h-3" />}
                {label}
            </div>

            <div className="flex justify-between items-end mb-2">
                <div>
                    <div className="text-[9px] text-red-500/70 uppercase font-bold mb-1 tracking-wider">LEGACY (FIXED)</div>
                    <div className="text-xl font-mono font-bold text-red-500/80">{fixed}</div>
                </div>
                <div className="text-right">
                    <div className="text-[9px] text-[#00ff9c]/70 uppercase font-bold mb-1 tracking-wider">NEURALNET (RL)</div>
                    <div className="text-2xl font-mono font-bold text-[#00ff9c] text-shadow-glow">
                        {rl} <span className="text-xs text-[#00ff9c]/50 font-normal">{unit}</span>
                    </div>
                </div>
            </div>

            <div className={`
                mt-3 pt-3 border-t border-white/5 flex items-center justify-between
                text-xs font-bold font-mono tracking-wider
                ${better ? 'text-[#00ff9c]' : 'text-amber-500'}
            `}>
                <span className="opacity-60 text-[9px] uppercase">Improvement Delta</span>
                <span className="flex items-center gap-1">
                    {better ? <ArrowUpRight className="w-3 h-3" /> : <Play className="w-3 h-3 rotate-90" />}
                    {improvement}
                </span>
            </div>

            {/* Decor */}
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#00ff9c]/20" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#00ff9c]/20" />
        </motion.div>
    );
}

const DeepAnalytics = () => {
    const navigate = useNavigate();
    const [metrics, setMetrics] = useState<ComparisonMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 2000); // Polling every 2s
        return () => clearInterval(interval);
    }, []);

    const fetchMetrics = async () => {
        try {
            const response = await axios.get('/api/simulation/comparison');
            setMetrics(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch metrics:', error);
        }
    };

    if (loading || !metrics) {
        return (
            <div className="h-screen w-screen bg-[#020202] text-[#00ff9c] flex flex-col items-center justify-center font-mono relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020202_90%)] z-10" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,156,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,156,0.05)_1px,transparent_1px)] bg-[length:20px_20px] opacity-20" />
                <Activity className="w-16 h-16 animate-pulse mb-4 z-20" />
                <div className="text-xs tracking-[0.5em] animate-pulse z-20">PROCESSING SIMULATION KERNEL...</div>
            </div>
        );
    }

    // Process Trend Data
    const trendData = metrics.time_series.fixed_waiting.map((val, i) => ({
        time: `${i * 10}s`,
        fixed: val,
        rl: metrics.time_series.rl_waiting[i] || 0
    }));

    // Normalize Radar Data
    const maxWait = Math.max(metrics.fixed.avg_waiting_time, metrics.rl.avg_waiting_time, 1);
    const maxQueue = Math.max(metrics.fixed.avg_queue_length, metrics.rl.avg_queue_length, 1);
    const maxThroughput = Math.max(metrics.fixed.total_throughput, metrics.rl.total_throughput, 1);

    const radarData = [
        { subject: 'Efficiency', A: 100 - (metrics.fixed.avg_waiting_time / maxWait * 100), B: 100 - (metrics.rl.avg_waiting_time / maxWait * 100), fullMark: 100 },
        { subject: 'Throughput', A: (metrics.fixed.total_throughput / maxThroughput * 100), B: (metrics.rl.total_throughput / maxThroughput * 100), fullMark: 100 },
        { subject: 'Queue Flow', A: 100 - (metrics.fixed.avg_queue_length / maxQueue * 100), B: 100 - (metrics.rl.avg_queue_length / maxQueue * 100), fullMark: 100 },
    ];

    const formatImprovement = (val: number) => {
        const sign = val > 0 ? '+' : '';
        return `${sign}${val.toFixed(1)}%`;
    };

    const cards = [
        {
            label: 'AVG WAIT TIME',
            fixed: metrics.fixed.avg_waiting_time.toFixed(1),
            rl: metrics.rl.avg_waiting_time.toFixed(1),
            unit: 's',
            improvement: formatImprovement(metrics.improvement.waiting_time_reduction),
            color: 'cyan',
            better: metrics.improvement.waiting_time_reduction > 0
        },
        {
            label: 'TOTAL THROUGHPUT',
            fixed: metrics.fixed.total_throughput.toString(),
            rl: metrics.rl.total_throughput.toString(),
            unit: 'veh',
            improvement: formatImprovement(metrics.improvement.throughput_increase),
            color: 'emerald',
            better: metrics.improvement.throughput_increase > 0
        },
        {
            label: 'QUEUE LENGTH',
            fixed: metrics.fixed.avg_queue_length.toFixed(1),
            rl: metrics.rl.avg_queue_length.toFixed(1),
            unit: 'veh',
            improvement: formatImprovement(metrics.improvement.queue_length_reduction),
            color: 'purple',
            better: metrics.improvement.queue_length_reduction > 0
        },
        {
            label: 'EFFICIENCY SCORE',
            fixed: 'BASELINE',
            rl: 'OPTIMIZED',
            unit: '',
            improvement: 'MAXIMAL',
            color: 'blue',
            better: true
        },
    ];

    return (
        <div className="h-screen w-screen bg-[#020202] text-[#e2e8f0] overflow-hidden flex flex-col font-mono selection:bg-[#00ff9c]/20">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,156,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,156,0.03)_1px,transparent_1px)] bg-[length:40px_40px] pointer-events-none opacity-30" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,255,156,0.05)_0%,transparent_50%)] pointer-events-none" />

            {/* Header */}
            <header className="h-14 border-b border-[#00ff9c]/20 bg-[#050505] flex items-center justify-between px-6 z-50 shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/')}>
                        <Cpu className="w-5 h-5 text-[#00ff9c]" />
                        <span className="font-bold tracking-[0.2em] text-sm group-hover:text-[#00ff9c] transition-colors">TRAFFIC.AI_ANALYTICS</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/live')}
                        className="group flex items-center gap-2 px-4 py-1.5 border border-[#00ff9c]/30 hover:bg-[#00ff9c]/10 text-[#00ff9c] text-[10px] font-bold uppercase tracking-widest transition-all"
                    >
                        <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                        <span>Return to Live Control</span>
                    </button>
                    <div className="w-px h-4 bg-[#00ff9c]/20 mx-2" />
                    <div className="flex gap-4 text-[10px] uppercase tracking-wider text-[#00ff9c]/60">
                        <span className="flex items-center gap-1"><Server className="w-3 h-3" /> Status: POST-RUN</span>
                        <span className="flex items-center gap-1"><Wifi className="w-3 h-3" /> Sync: ACTIVE</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8 relative z-10 scrollbar-thin scrollbar-thumb-[#00ff9c]/20 scrollbar-track-transparent">
                <div className="max-w-[1600px] mx-auto space-y-8">

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {cards.map((card, idx) => (
                            <StatCard key={idx} index={idx} {...card} />
                        ))}
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[450px]">

                        {/* Area Chart - Spans 2 cols */}
                        <div className="lg:col-span-2 bg-[#0a0a0a] border border-[#00ff9c]/20 p-6 relative group hover:border-[#00ff9c]/40 transition-colors">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-[#00ff9c] text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-2">
                                    <Activity className="w-4 h-4" /> Wait Time Latency Distribution
                                </h3>
                                <div className="flex gap-4 text-[9px] font-bold uppercase tracking-widest">
                                    <span className="flex items-center gap-1 text-red-500"><div className="w-2 h-2 bg-red-500 rounded-sm" /> Legacy</span>
                                    <span className="flex items-center gap-1 text-[#00ff9c]"><div className="w-2 h-2 bg-[#00ff9c] rounded-sm" /> Neural_Net</span>
                                </div>
                            </div>

                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData}>
                                        <defs>
                                            <linearGradient id="colorFixed" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorRl" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00ff9c" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#00ff9c" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                        <XAxis dataKey="time" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                                        <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}s`} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#050505', borderColor: '#333' }}
                                            labelStyle={{ color: '#fff', fontSize: '12px' }}
                                            itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                                        />
                                        <Area type="monotone" dataKey="fixed" stroke="#ef4444" fillOpacity={1} fill="url(#colorFixed)" strokeWidth={2} activeDot={{ r: 6 }} />
                                        <Area type="monotone" dataKey="rl" stroke="#00ff9c" fillOpacity={1} fill="url(#colorRl)" strokeWidth={2} activeDot={{ r: 6 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Corner Decors */}
                            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#00ff9c]/40" />
                            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#00ff9c]/40" />
                        </div>

                        {/* Radar Chart */}
                        <div className="bg-[#0a0a0a] border border-[#00ff9c]/20 p-6 relative group hover:border-[#00ff9c]/40 transition-colors flex flex-col">
                            <h3 className="text-[#00ff9c] text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-2 mb-4">
                                <BarChart2 className="w-4 h-4" /> Performance Vector
                            </h3>

                            <div className="flex-1 w-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                        <PolarGrid stroke="#ffffff10" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#00ff9c', fontSize: 10, opacity: 0.7 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar name="Legacy" dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                                        <Radar name="Neural_Net" dataKey="B" stroke="#00ff9c" fill="#00ff9c" fillOpacity={0.2} />
                                        <Legend wrapperStyle={{ fontSize: '10px', marginTop: '20px', fontFamily: 'monospace' }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="mt-4 pt-4 border-t border-white/5 text-[9px] font-mono text-gray-500 flex justify-between uppercase tracking-wider">
                                <span>Optimization Model: PPO-Clip</span>
                                <span>Version: 3.1.0</span>
                            </div>

                            {/* Corner Decors */}
                            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#00ff9c]/40" />
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#00ff9c]/40" />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DeepAnalytics;

