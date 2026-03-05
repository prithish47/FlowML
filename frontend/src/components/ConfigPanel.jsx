import { Settings2, Database, BarChart3, Cloud, Layout, Sliders, Hash, Layers, Info } from 'lucide-react';
import { usePipeline } from '../context/PipelineContext';
import { NODE_TYPES } from '../utils/nodeDefinitions';
import { motion, AnimatePresence } from 'framer-motion';

export default function ConfigPanel() {
    const { nodes, setNodes, selectedNodeId, uploadFile } = usePipeline();
    const selectedNode = nodes.find(n => n.id === selectedNodeId);

    if (!selectedNodeId) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center h-full bg-[#f8fafc]">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-16 h-16 rounded-2xl bg-white border border-black/5 flex items-center justify-center mb-6 shadow-sm"
                >
                    <Sliders size={32} className="#cbd5e1" strokeWidth={1} />
                </motion.div>
                <h3 className="text-[13px] font-bold text-[#0f172a] mb-2 uppercase tracking-widest">Properties</h3>
                <p className="text-[12px] text-[#64748b] max-w-[220px] leading-relaxed">
                    Select a node on the canvas to configure its parameters and view technical details.
                </p>
            </div>
        );
    }

    const nodeDef = NODE_TYPES[selectedNode.data.nodeType];

    const updateConfig = (key, value) => {
        setNodes(prev => prev.map(n =>
            n.id === selectedNodeId
                ? { ...n, data: { ...n.data, config: { ...n.data.config, [key]: value } } }
                : n
        ));
    };

    const handleNumberChange = (key, value) => {
        const parsed = value === '' ? null : parseFloat(value);
        updateConfig(key, parsed);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const fileId = await uploadFile(file);
                updateConfig('fileId', fileId);
            } catch (err) {
                console.error('Upload failed:', err);
            }
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#ffffff] overflow-hidden border-l border-black/5">
            {/* Header Area */}
            <div className="p-8 border-b border-black/5 bg-[#f8fafc]/30">
                <div className="flex items-center gap-4 mb-5">
                    <div className="w-11 h-11 rounded-lg bg-[#2563eb]/10 border border-[#2563eb]/20 flex items-center justify-center">
                        <Settings2 className="text-[#2563eb]" size={22} />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-[#2563eb] uppercase tracking-widest block mb-1">
                            Node Configuration
                        </span>
                        <h2 className="text-[18px] font-bold text-[#0f172a] tracking-tight">
                            {selectedNode.data.label}
                        </h2>
                    </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-[#f8fafc] border border-black/5">
                    <Info size={14} className="text-[#94a3b8] mt-0.5 shrink-0" />
                    <p className="text-[12px] text-[#475569] leading-relaxed italic">
                        {selectedNode.data.description}
                    </p>
                </div>
            </div>

            {/* Parameters Section */}
            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-black/5 pb-2">
                        <h3 className="text-[11px] font-bold text-[#0f172a] uppercase tracking-wider">Parameters</h3>
                        <span className="text-[10px] font-mono text-[#94a3b8] bg-[#f8fafc] px-2 py-0.5 rounded border border-black/5">ID: {selectedNode.id.split('-').slice(-1)}</span>
                    </div>

                    <div className="space-y-8">
                        {Object.entries(nodeDef.config || {}).map(([key, field]) => (
                            <div key={key} className="space-y-3">
                                <label className="text-[12px] font-bold text-[#475569] flex items-center gap-2">
                                    {field.label} {field.required && <span className="text-[#dc2626]">*</span>}
                                </label>

                                {field.type === 'string' && key === 'fileId' ? (
                                    <div className="space-y-3">
                                        <div className="relative group/upload">
                                            <input
                                                type="file"
                                                accept=".csv"
                                                onChange={handleFileUpload}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className="w-full h-12 border border-dashed border-black/10 rounded-lg bg-[#f8fafc] group-hover:bg-[#f1f5f9] transition-all flex items-center justify-center gap-3">
                                                <Cloud className="w-4 h-4 text-[#94a3b8]" />
                                                <span className="text-[12px] font-bold text-[#64748b]">
                                                    {selectedNode.data.config[key] ? 'Replace Dataset' : 'Upload Data (.csv)'}
                                                </span>
                                            </div>
                                        </div>
                                        {selectedNode.data.config[key] && (
                                            <div className="bg-[#2563eb]/5 border border-[#2563eb]/10 px-4 py-3 rounded-lg flex items-center justify-between">
                                                <p className="text-[11px] text-[#2563eb] font-mono truncate max-w-[85%]">
                                                    {selectedNode.data.config[key]}
                                                </p>
                                                <div className="w-2 h-2 rounded-full bg-[#2563eb] shadow-[0_0_8px_rgba(37,99,235,0.3)]" />
                                            </div>
                                        )}
                                    </div>
                                ) : field.type === 'select' ? (
                                    <div className="relative">
                                        <select
                                            value={selectedNode.data.config[key] || ''}
                                            onChange={(e) => updateConfig(key, e.target.value)}
                                            className="w-full h-10 rounded-lg bg-[#f1f5f9] border border-black/5 focus:ring-1 focus:ring-[#2563eb]/30 focus:outline-none px-4 text-[13px] text-[#0f172a] appearance-none cursor-pointer font-medium"
                                        >
                                            <option value="" disabled>Select option...</option>
                                            {(field.options || []).map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <input
                                        type={field.type === 'number' ? 'number' : 'text'}
                                        value={selectedNode.data.config[key] ?? ''}
                                        onChange={(e) => field.type === 'number' 
                                            ? handleNumberChange(key, e.target.value) 
                                            : updateConfig(key, e.target.value)
                                        }
                                        className="w-full h-10 rounded-lg bg-[#f1f5f9] border border-black/5 focus:ring-1 focus:ring-[#2563eb]/30 focus:outline-none px-4 text-[13px] text-[#0f172a] placeholder-[#94a3b8] transition-all font-medium"
                                        placeholder="Enter value..."
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {(!nodeDef.config || Object.keys(nodeDef.config).length === 0) && (
                        <div className="py-12 text-center border border-dashed border-black/5 rounded-xl bg-[#f8fafc]">
                            <Layers className="mx-auto mb-4 text-[#cbd5e1]" size={28} strokeWidth={1} />
                            <p className="text-[11px] text-[#94a3b8] font-bold uppercase tracking-widest">No parameters to configure</p>
                        </div>
                    )}
                </div>

                {/* Technical Overview */}
                <div className="space-y-6 pt-8 border-t border-black/5">
                    <h3 className="text-[11px] font-bold text-[#0f172a] uppercase tracking-wider">Node Metadata</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-[#f8fafc] rounded-lg border border-black/5 space-y-3 shadow-inner">
                            <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest block">Input Bus</span>
                            <div className="flex flex-wrap gap-2">
                                {selectedNode.data.inputs.length > 0 ? selectedNode.data.inputs.map(i => (
                                    <div key={i} className="bg-white px-2 py-0.5 rounded text-[10px] font-bold text-[#475569] border border-black/5 uppercase">{i}</div>
                                )) : <span className="text-[10px] text-[#cbd5e1] font-mono italic font-bold">EMPTY</span>}
                            </div>
                        </div>
                        <div className="p-4 bg-[#f8fafc] rounded-lg border border-black/5 space-y-3 shadow-inner">
                            <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest block">Output Bus</span>
                            <div className="flex flex-wrap gap-2">
                                {selectedNode.data.outputs.length > 0 ? selectedNode.data.outputs.map(o => (
                                    <div key={o} className="bg-white px-2 py-0.5 rounded text-[10px] font-bold text-[#475569] border border-black/5 uppercase">{o}</div>
                                )) : <span className="text-[10px] text-[#cbd5e1] font-mono italic font-bold">EMPTY</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Status */}
            <div className="p-5 border-t border-black/5 bg-[#f8fafc] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${selectedNode.data.status === 'success' ? 'bg-[#16a34a]' :
                        selectedNode.data.status === 'running' ? 'bg-[#2563eb] animate-pulse' :
                            selectedNode.data.status === 'failed' ? 'bg-[#dc2626]' : 'bg-[#cbd5e1]'
                        }`} />
                    <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-widest">
                        Node {selectedNode.data.status || 'Idle'}
                    </span>
                </div>
                <span className="text-[10px] font-mono text-[#cbd5e1] font-bold">v1.0.4-core</span>
            </div>
        </div>
    );
}
