import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, Cpu, ChevronLeft, Activity, ShieldAlert, Sparkles, Zap } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';

interface DecisionLog {
    step: number;
    tls_id: string;
    action: number;
    waiting_time: number;
    queue_length: number;
    is_emergency?: boolean;
    emergency_vehicle?: string;
    preemption_count?: number;
}

const AgentDecision = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<DecisionLog[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await axios.get('/api/simulation/decisions');
                // Only take the last 50 for the narrative stream to keep it snappy
                setLogs(response.data.slice(0, 50));
            } catch (error) {
                console.error('Failed to fetch decisions:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 2000);
        return () => clearInterval(interval);
    }, []);

    const getActionDescription = (action: number) => {
        const descriptions = [
            "North-South Straight",
            "North-South Left",
            "East-West Straight",
            "East-West Left"
        ];
        return descriptions[action] || `Phase Index ${action}`;
    };

    return (
        <div className="h-screen w-screen bg-cyber-layers text-white overflow-hidden flex flex-col font-mono selection:bg-cyan-500/20 relative">
            <div className="bg-noise absolute inset-0 z-0" />
            <div className="scan-sweep z-0" />

            {/* Top Bar */}
            <header className="h-14 border-b border-white/10 bg-black/60 backdrop-blur-xl flex items-center justify-between px-6 z-50">
                <div className="flex items-center gap-6">
                    <div
                        onClick={() => navigate('/live')}
                        className="flex items-center gap-3 group cursor-pointer border border-white/5 px-3 py-1 hover:border-cyan-500/50 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4 text-cyan-500 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Back_to_Live</span>
                    </div>
                    <div className="h-5 w-px bg-white/10" />
                    <div className="flex items-center gap-3">
                        <Terminal className="w-5 h-5 text-cyan-500" />
                        <span className="font-black tracking-[0.4em] text-xs uppercase">Decision_Narrative_Stream</span>
                    </div>
                </div>

                <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest">
                    <span className="text-cyan-500/60 flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Reasoning_Engine_Online
                    </span>
                    <span className="text-white/40 border-l border-white/10 pl-6 h-4 flex items-center">
                        Active_Threads: {(logs.length > 0 ? new Set(logs.map(l => l.tls_id)).size : 0)}
                    </span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden p-8 z-10 flex flex-col gap-6 max-w-6xl mx-auto w-full">
                <div className="flex justify-between items-end border-b border-cyan-500/20 pb-4">
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-4">
                            Agent_Reasoning_Protocol
                            <span className="text-[#00ff9c] text-sm bg-[#00ff9c]/10 px-2 py-0.5 border border-[#00ff9c]/20 rounded-sm">V4_LLM_CORE</span>
                        </h1>
                        <p className="text-cyan-500/40 text-[10px] font-bold uppercase tracking-[0.4em] mt-1">
                            Narrative audit of autonomous spatial decisions
                        </p>
                    </div>
                </div>

                {/* Narrative Stream Area */}
                <div className="flex-1 overflow-hidden flex flex-col gap-4">
                    <div className="flex-1 overflow-y-auto pr-4 scrollbar-hide space-y-4" ref={scrollRef}>
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center gap-4 opacity-30">
                                <Cpu className="w-8 h-8 animate-spin" />
                                <span className="text-xs font-black tracking-[0.5em] uppercase">Decoding_Neural_Buffers...</span>
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center gap-4 opacity-20 border-2 border-dashed border-white/5 rounded-xl">
                                <ShieldAlert className="w-10 h-10" />
                                <span className="text-xs font-black tracking-[0.5em] uppercase">No_Active_Intelligence_Detected</span>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {logs.map((log, i) => (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                        key={`${log.tls_id}-${log.step}-${i}`}
                                        className="relative group border-l-2 border-[#00ff9c]/30 hover:border-[#00ff9c] bg-white/[0.02] hover:bg-white/[0.04] p-4 transition-all"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1">
                                                <div className="w-8 h-8 rounded bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 group-hover:scale-110 transition-transform">
                                                    <Zap className="w-4 h-4 text-cyan-400" />
                                                </div>
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="text-[10px] font-black text-white/40 tabular-nums uppercase tracking-widest">
                                                        Step_{log.step.toString().padStart(5, '0')}
                                                    </span>
                                                    <div className="h-px w-8 bg-white/10" />
                                                    <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">
                                                        Agent_{log.tls_id}
                                                    </span>
                                                    {log.queue_length > 10 && (
                                                        <span className="text-[8px] bg-[#ffaa00]/10 text-[#ffaa00] px-1.5 py-0.5 border border-[#ffaa00]/20 rounded-full font-black animate-pulse uppercase">
                                                            High_Congestion
                                                        </span>
                                                    )}
                                                </div>

                                                {log.is_emergency ? (
                                                    <p className="text-[13px] leading-relaxed text-white/90 font-medium border-l-2 border-[#ff004c] pl-4 bg-[#ff004c]/5 py-2">
                                                        <span className="text-[#ff004c] font-black uppercase flex items-center gap-2 mb-1">
                                                            <ShieldAlert className="w-4 h-4" /> EMERGENCY_PREEMPTION_ACTIVE
                                                        </span>
                                                        Agent <span className="text-cyan-400 font-bold">{log.tls_id}</span> detected priority vehicle <span className="text-[#ff004c] font-black">{log.emergency_vehicle}</span>.
                                                        Forcing override: <span className="text-[#00ff9c] font-black uppercase">{getActionDescription(log.action)} set to GREEN</span>.
                                                        Total successful preemptions: <span className="text-white font-black">{log.preemption_count}</span>.
                                                    </p>
                                                ) : (
                                                    <p className="text-[13px] leading-relaxed text-white/90 font-medium">
                                                        Agent <span className="text-cyan-400 font-black">{log.tls_id}</span> identified a
                                                        <span className="text-amber-500 font-black mx-1">Queue Depth of {log.queue_length}</span>.
                                                        Action: <span className="text-[#00ff9c] font-black uppercase">MADE {getActionDescription(log.action)} SIGNAL GREEN</span>.
                                                        All other lanes for agent <span className="text-cyan-400 font-bold">{log.tls_id}</span> are now held at <span className="text-[#ff004c] font-black uppercase tracking-tighter">RED_STOP</span>.
                                                    </p>
                                                )}

                                                <div className="mt-3 flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-white/30">
                                                    <span className="flex items-center gap-1.5"><Activity className="w-3 h-3" /> {log.is_emergency ? "Priority_Flow" : `Wait: ${log.waiting_time.toFixed(1)}s`}</span>
                                                    <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Consensus: Confirmed</span>
                                                    <span className="text-[#ff004c]/60">Conflict_Lanes: Locked_RED</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Decorative pulse point */}
                                        <div className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#00ff9c] shadow-[0_0_8px_#00ff9c] opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Notice */}
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.3em] text-white/20 px-4 py-3 border-t border-white/5 bg-black/20">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#00ff9c] animate-pulse" /> Stream_Live</span>
                        <span className="opacity-50">Narrative_Logic: v4.2.1-stable</span>
                    </div>
                    <span>System_Time: {new Date().toLocaleTimeString()}</span>
                </div>
            </main>
        </div>
    );
};

export default AgentDecision;
