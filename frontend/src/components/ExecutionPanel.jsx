import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, BarChart2, Database, ChevronDown, ChevronUp, Box, Download, Clock, HardDrive } from 'lucide-react';
import { usePipeline } from '../context/PipelineContext';
import MetricsDashboard from './MetricsDashboard';

export default function ExecutionPanel() {
    const { logs, results, executionState, downloadModel, modelDownloadAvailable } = usePipeline();
    const [activeTab, setActiveTab] = useState('logs');
    const [isMinimized, setIsMinimized] = useState(false);
    const [panelHeight, setPanelHeight] = useState(450);
    const [isResizing, setIsResizing] = useState(false);

    const startResizing = useCallback((e) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((e) => {
        if (isResizing) {
            const newHeight = window.innerHeight - e.clientY;
            if (newHeight > 60 && newHeight < window.innerHeight - 200) {
                setPanelHeight(newHeight);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
        } else {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing, resize, stopResizing]);

    const getModelType = () => {
        if (!results) return 'N/A';
        const evalNode = Object.values(results).find(r => r.model_type);
        return evalNode?.model_type || 'Custom Model';
    };

    return (
        <motion.div
            initial={false}
            animate={{ height: isMinimized ? 44 : panelHeight }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-[#ffffff] border-t border-black/10 flex flex-col relative overflow-hidden shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)]"
        >
            {/* Resize Handle */}
            {!isMinimized && (
                <div
                    onMouseDown={startResizing}
                    className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-[#2563eb]/30 transition-all z-50"
                />
            )}

            {/* Header / Tab Bar */}
            <div className={`h-11 px-6 flex items-center justify-between border-b border-black/5 select-none ${isMinimized ? 'cursor-pointer hover:bg-black/[0.02]' : ''}`}
                onClick={() => isMinimized && setIsMinimized(false)}>

                <div className="flex items-center gap-6 h-full font-sans">
                    <div className="flex items-center gap-2 mr-4 border-r border-black/5 pr-4 h-6">
                        <Terminal size={14} className={executionState === 'running' ? 'text-[#2563eb] animate-pulse' : 'text-[#94a3b8]'} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">System Terminal</span>
                    </div>

                    {!isMinimized && [
                        { id: 'logs', label: 'Console', icon: Terminal },
                        { id: 'metrics', label: 'Evaluation', icon: BarChart2 },
                        { id: 'model', label: 'Model Artifact', icon: Box },
                        { id: 'data', label: 'System', icon: Database }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={(e) => { e.stopPropagation(); setActiveTab(tab.id); }}
                            className={`h-full flex items-center gap-2 text-[10px] font-bold uppercase tracking-tight transition-all relative px-2 ${activeTab === tab.id ? 'text-[#0f172a]' : 'text-[#94a3b8] hover:text-[#475569]'
                                }`}
                        >
                            <tab.icon size={13} />
                            <span>{tab.label}</span>
                            {activeTab === tab.id && (
                                <motion.div layoutId="activeTabUnderline" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#2563eb]" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-3 py-1 bg-[#f8fafc] rounded-full border border-black/5 shadow-inner`}>
                        <div className={`w-2 h-2 rounded-full ${executionState === 'running' ? 'bg-[#2563eb] animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.4)]' :
                            executionState === 'completed' ? 'bg-[#16a34a] shadow-[0_0_8px_rgba(22,163,74,0.4)]' :
                                executionState === 'failed' ? 'bg-[#dc2626] shadow-[0_0_8px_rgba(220,38,38,0.4)]' : 'bg-[#cbd5e1]'
                            }`} />
                        <span className="text-[9px] font-bold text-[#64748b] uppercase tracking-wide">
                            {executionState || 'Standby'}
                        </span>
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                        className="p-1 rounded-md hover:bg-black/5 text-[#94a3b8] transition-colors"
                    >
                        {isMinimized ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <AnimatePresence mode="wait">
                {!isMinimized && (
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 overflow-y-auto custom-scrollbar bg-[#fcfcfd]"
                    >
                        {activeTab === 'logs' && (
                            <div className="p-6 font-mono space-y-1.5">
                                {logs.length === 0 ? (
                                    <div className="h-full py-20 flex flex-col items-center justify-center text-[#cbd5e1]">
                                        <Terminal size={40} strokeWidth={1} />
                                        <p className="text-[10px] uppercase tracking-[0.4em] mt-4 font-sans font-bold">No process logs</p>
                                    </div>
                                ) : (
                                    logs.map((log, i) => (
                                        <div key={i} className="flex gap-4 text-[12px] group py-0.5 border-b border-black/[0.02]">
                                            <span className="text-[#94a3b8] shrink-0 tabular-nums">[{log.time}]</span>
                                            <span className={`
                                                min-w-[70px] text-[10px] font-bold uppercase
                                                ${log.type === 'error' ? 'text-[#dc2626]' :
                                                    log.type === 'success' ? 'text-[#16a34a]' :
                                                        'text-[#2563eb]'}
                                            `}>
                                                {log.type}
                                            </span>
                                            <span className="text-[#475569] group-hover:text-[#0f172a] transition-colors break-all leading-relaxed">
                                                {log.message}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'metrics' && (
                            <div className="p-8 h-full">
                                {results ? <MetricsDashboard results={results} /> : (
                                    <div className="h-full py-20 flex flex-col items-center justify-center text-[#94a3b8] uppercase tracking-widest text-[11px] font-sans font-bold">
                                        <BarChart2 size={40} className="mb-4" strokeWidth={1} />
                                        Awaiting pipeline execution...
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'model' && (
                            <div className="p-12 max-w-4xl mx-auto h-full flex flex-col items-center justify-center">
                                {modelDownloadAvailable ? (
                                    <div className="w-full bg-[#ffffff] border border-black/10 rounded-2xl p-8 space-y-8 shadow-sm">
                                        <div className="flex items-center gap-6">
                                            <div className="w-20 h-20 bg-[#2563eb]/5 rounded-2xl flex items-center justify-center border border-[#2563eb]/10">
                                                <Box size={40} className="text-[#2563eb]" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-[#0f172a]">Inference Model Artifact</h3>
                                                <p className="text-[#64748b] text-[13px] mt-1">Serialized trained model ready for deployment.</p>
                                            </div>
                                            <button
                                                onClick={downloadModel}
                                                className="h-12 px-8 bg-[#2563eb] text-white rounded-xl font-bold text-[14px] flex items-center gap-3 hover:bg-[#1d4ed8] shadow-lg shadow-[#2563eb]/20 transition-all"
                                            >
                                                <Download size={18} />
                                                Download Artifact
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-3 gap-6 pt-4 border-t border-black/5">
                                            <div className="space-y-1">
                                                <span className="flex items-center gap-2 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">
                                                    <Box size={12} /> Model Type
                                                </span>
                                                <p className="text-[14px] font-bold text-[#475569]">{getModelType().toUpperCase()}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="flex items-center gap-2 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">
                                                    <Clock size={12} /> Trained At
                                                </span>
                                                <p className="text-[14px] font-bold text-[#475569]">{new Date().toLocaleTimeString()}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="flex items-center gap-2 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">
                                                    <HardDrive size={12} /> Artifact Size
                                                </span>
                                                <p className="text-[14px] font-bold text-[#475569]">~18.4 KB</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-center max-w-md">
                                        <div className="w-16 h-16 bg-[#f8fafc] rounded-full flex items-center justify-center mb-6 border border-black/5">
                                            <Box size={24} className="text-[#cbd5e1]" />
                                        </div>
                                        <h3 className="text-[14px] font-bold text-[#0f172a] mb-2 uppercase tracking-wide">No model artifact found</h3>
                                        <p className="text-[#64748b] text-[12px] leading-relaxed">
                                            Follow the ML workflow by adding a Training node and running the pipeline to generate a downloadable model artifact.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'data' && (
                            <div className="p-8 h-full flex items-center justify-center font-sans">
                                <p className="text-[#94a3b8] text-[11px] uppercase tracking-[0.2em] font-bold">
                                    Engine ID: flowml-core-01 | Pod Status: Active
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
