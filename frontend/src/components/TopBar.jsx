import { useState, useMemo } from 'react';
import { Play, Save, FolderOpen, Plus, User, LogOut, Zap, Download, Info, CheckCircle2, CloudFog, CloudOff, Loader2 } from 'lucide-react';
import { usePipeline } from '../context/PipelineContext';
import { useAuth } from '../context/AuthContext';
import PipelineManager from './PipelineManager';
import GenerateModal from './GenerateModal';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2 } from 'lucide-react';

export default function TopBar() {
    const {
        pipelineName, setPipelineName, runPipeline, savePipeline,
        executionState, clearPipeline, downloadModel, modelDownloadAvailable,
        saveStatus
    } = usePipeline();

    const { user, logout } = useAuth();
    const [showPipelineManager, setShowPipelineManager] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showDownloadTooltip, setShowDownloadTooltip] = useState(false);

    const handleRun = async () => {
        try {
            await runPipeline();
        } catch (err) {
            console.error('Execution failed:', err);
        }
    };

    const handleSave = async () => {
        try {
            await savePipeline();
        } catch (err) {
            console.error('Save failed:', err);
        }
    };

    const statusIndicator = useMemo(() => {
        switch (saveStatus) {
            case 'saving':
                return (
                    <div className="flex items-center gap-1.5 text-amber-500 font-bold uppercase tracking-widest text-[9px] animate-pulse">
                        <Loader2 size={10} className="animate-spin" />
                        <span>Saving...</span>
                    </div>
                );
            case 'unsaved':
                return (
                    <div className="flex items-center gap-1.5 text-rose-500 font-bold uppercase tracking-widest text-[9px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                        <span>Unsaved Changes</span>
                    </div>
                );
            case 'saved':
            default:
                return (
                    <div className="flex items-center gap-1.5 text-emerald-500 font-bold uppercase tracking-widest text-[9px]">
                        <CheckCircle2 size={10} />
                        <span>Saved</span>
                    </div>
                );
        }
    }, [saveStatus]);

    return (
        <header className="h-16 bg-[#ffffff] border-b border-black/5 flex items-center justify-between px-6 z-50">
            {/* Left Section: Logo & Pipeline Name */}
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-3 group cursor-pointer" onClick={clearPipeline}>
                    <div className="w-10 h-10 bg-[#2563eb] rounded-lg flex items-center justify-center shadow-[0_4px_12px_rgba(37,99,235,0.2)]">
                        <Zap className="text-white fill-current" size={22} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[15px] font-bold tracking-tight text-[#0f172a] leading-none mb-1">FlowML</span>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#64748b]">Designer</span>
                    </div>
                </div>

                <div className="h-6 w-[1px] bg-black/5 mx-2" />

                <div className="flex flex-col gap-1">
                    <div className="flex items-center">
                        {isEditing ? (
                            <input
                                autoFocus
                                className="bg-[#f8fafc] border border-[#2563eb]/30 rounded px-3 py-1.5 text-[14px] font-medium text-[#0f172a] focus:outline-none w-[240px]"
                                value={pipelineName}
                                onChange={(e) => setPipelineName(e.target.value)}
                                onBlur={() => setIsEditing(false)}
                                onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
                            />
                        ) : (
                            <div
                                onClick={() => setIsEditing(true)}
                                className="group flex items-center gap-3 cursor-pointer px-3 py-1.5 rounded hover:bg-black/5 transition-all"
                            >
                                <span className="text-[14px] font-medium text-[#0f172a]">{pipelineName}</span>
                                <span className="px-1.5 py-0.5 rounded bg-black/5 text-[9px] font-bold text-[#94a3b8] uppercase tracking-wider">v1.0</span>
                            </div>
                        )}
                    </div>
                    <div className="px-3">
                        {statusIndicator}
                    </div>
                </div>
            </div>

            {/* Center Section: Core Toolbar */}
            <div className="flex items-center gap-1.5 bg-[#f1f5f9] p-1.5 rounded-xl border border-black/[0.04] shadow-inner">
                {[
                    { label: 'New', icon: Plus, action: clearPipeline },
                    { label: 'Open', icon: FolderOpen, action: () => setShowPipelineManager(true) },
                    { label: saveStatus === 'saving' ? 'Saving...' : 'Save', icon: Save, action: handleSave, disabled: saveStatus === 'saving' }
                ].map((btn, i) => (
                    <button
                        key={i}
                        onClick={btn.action}
                        disabled={btn.disabled}
                        className="group h-[32px] px-4 flex items-center gap-2 rounded-lg bg-transparent hover:bg-white text-[12px] font-semibold text-[#64748b] hover:text-[#0f172a] transition-all duration-200 disabled:opacity-40 border border-transparent hover:border-black/5 hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] active:scale-[0.98]"
                    >
                        <btn.icon size={15} strokeWidth={2.5} className="group-hover:text-[#2563eb] transition-colors" />
                        <span>{btn.label}</span>
                    </button>
                ))}
            </div>

            {/* Right Section: Actions & User */}
            <div className="flex items-center gap-4">
                {/* AI Generator Button */}
                <button
                    onClick={() => setIsGenerateModalOpen(true)}
                    className="h-9 px-4 flex items-center gap-2 rounded-lg bg-indigo-50 border border-indigo-100 hover:bg-indigo-100/80 text-indigo-600 font-semibold text-[12px] shadow-sm transition-all"
                >
                    <Wand2 size={16} />
                    <span>Generate with AI</span>
                </button>

                <div className="h-6 w-[1px] bg-black/5 mx-1" />

                {/* Download Model Button */}
                <div className="relative">
                    <button
                        onClick={downloadModel}
                        onMouseEnter={() => !modelDownloadAvailable && setShowDownloadTooltip(true)}
                        onMouseLeave={() => setShowDownloadTooltip(false)}
                        disabled={!modelDownloadAvailable}
                        className={`
                            h-9 px-4 flex items-center gap-2 rounded font-semibold text-[12px] transition-all
                            ${modelDownloadAvailable
                                ? 'bg-white text-[#0f172a] border border-black/10 hover:bg-black/5 cursor-pointer shadow-sm'
                                : 'text-[#94a3b8] cursor-not-allowed border border-dashed border-black/10'
                            }
                        `}
                    >
                        <Download size={16} />
                        <span>Download Model</span>
                        {!modelDownloadAvailable && <Info size={12} className="ml-1 opacity-50" />}
                    </button>

                    <AnimatePresence>
                        {showDownloadTooltip && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute top-11 right-0 w-56 bg-white border border-black/10 p-3 rounded-lg shadow-xl z-[60]"
                            >
                                <p className="text-[11px] text-[#64748b] leading-relaxed">
                                    Run pipeline successfully to download the trained model artifact.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <button
                    onClick={handleRun}
                    disabled={executionState === 'running'}
                    className={`
                        h-9 px-6 flex items-center gap-2 rounded font-bold text-[12px] uppercase tracking-wider transition-all active:scale-[0.98]
                        ${executionState === 'running'
                            ? 'bg-[#f1f5f9] text-[#2563eb] cursor-wait border border-black/5'
                            : 'bg-[#2563eb] text-white hover:bg-[#1d4ed8] shadow-[0_4px_12px_rgba(37,99,235,0.3)]'
                        }
                    `}
                >
                    <Play size={16} className={executionState === 'running' ? 'animate-spin' : 'fill-current'} />
                    <span>{executionState === 'running' ? 'Running' : 'Run Pipeline'}</span>
                </button>

                <div className="h-6 w-[1px] bg-black/5 mx-1" />

                <div className="relative">
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="w-10 h-10 rounded-lg bg-[#f8fafc] border border-black/5 flex items-center justify-center hover:bg-black/5 transition-all group"
                    >
                        <User size={20} className="text-[#64748b] group-hover:text-[#0f172a] transition-colors" />
                    </button>

                    <AnimatePresence>
                        {showUserMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute right-0 mt-3 w-64 bg-white border border-black/10 rounded-xl shadow-2xl p-2 z-[100]"
                            >
                                <div className="p-4 border-b border-black/5 mb-2">
                                    <h4 className="text-[13px] font-bold text-[#0f172a]">{user?.name}</h4>
                                    <p className="text-[11px] text-[#64748b] font-mono">{user?.email}</p>
                                </div>
                                <button
                                    onClick={logout}
                                    className="w-full text-left p-3 text-[12px] font-semibold text-[#dc2626] hover:bg-[#dc2626]/5 rounded-lg transition-all flex items-center gap-3"
                                >
                                    <LogOut size={16} />
                                    <span>Sign Out</span>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {showPipelineManager && (
                <PipelineManager onClose={() => setShowPipelineManager(false)} />
            )}

            {isGenerateModalOpen && (
                <GenerateModal isOpen={isGenerateModalOpen} onClose={() => setIsGenerateModalOpen(false)} />
            )}
        </header>
    );
}
