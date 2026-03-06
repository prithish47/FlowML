import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import { executeAPI, pipelineAPI, uploadAPI } from '../utils/api';

const PipelineContext = createContext(null);

export function PipelineProvider({ children }) {
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [pipelineName, setPipelineName] = useState('Untitled Pipeline');
    const [pipelineId, setPipelineId] = useState(null);
    const [executionState, setExecutionState] = useState('idle'); // idle | running | completed | failed
    const [logs, setLogs] = useState([]);
    const [results, setResults] = useState(null);
    const [uploadedFiles, setUploadedFiles] = useState({});
    const [isLocked, setIsLocked] = useState(false);
    const [clipboard, setClipboard] = useState(null);
    const [modelDownloadAvailable, setModelDownloadAvailable] = useState(false);
    const [modelFileId, setModelFileId] = useState(null);
    const [hasDismissedOnboarding, setHasDismissedOnboarding] = useState(false);
    
    // Auto-save state
    const [saveStatus, setSaveStatus] = useState('saved'); // saved | unsaved | saving
    const autoSaveTimerRef = useRef(null);
    const isInitialLoad = useRef(true);

    const savePipeline = useCallback(async (currentData = null) => {
        setSaveStatus('saving');
        try {
            const data = currentData || { name: pipelineName, nodes, edges };
            if (pipelineId) {
                const res = await pipelineAPI.update(pipelineId, data);
                setSaveStatus('saved');
                return res.data.pipeline;
            } else {
                const res = await pipelineAPI.create(data);
                setPipelineId(res.data.pipeline._id);
                setSaveStatus('saved');
                return res.data.pipeline;
            }
        } catch (err) {
            console.error('Save failed:', err);
            setSaveStatus('unsaved');
            throw err;
        }
    }, [pipelineName, nodes, edges, pipelineId]);

    // Trigger auto-save when nodes, edges, or name changes
    useEffect(() => {
        if (isInitialLoad.current) {
            isInitialLoad.current = false;
            return;
        }

        setSaveStatus('unsaved');

        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        autoSaveTimerRef.current = setTimeout(() => {
            savePipeline();
        }, 2000);

        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, [nodes, edges, pipelineName, savePipeline]);

    // Cascade edge cleanup when nodes are removed - prevents orphan edges
    const onNodesChange = useCallback(
        (changes) => {
            const removeIds = new Set(
                changes.filter(c => c.type === 'remove').map(c => c.id)
            );
            setNodes((nds) => applyNodeChanges(changes, nds));
            if (removeIds.size > 0) {
                setEdges((eds) => eds.filter(
                    e => !removeIds.has(e.source) && !removeIds.has(e.target)
                ));
            }
        },
        []
    );

    const onEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        []
    );

    const deleteNodes = useCallback((nodeIds) => {
        if (!nodeIds || nodeIds.length === 0) return;
        const idSet = new Set(nodeIds);
        setNodes((nds) => nds.filter(n => !idSet.has(n.id)));
        setEdges((eds) => eds.filter(
            e => !idSet.has(e.source) && !idSet.has(e.target)
        ));
        setSelectedNodeId((prev) => idSet.has(prev) ? null : prev);
    }, []);

    const deleteEdges = useCallback((edgeIds) => {
        if (!edgeIds || edgeIds.length === 0) return;
        const idSet = new Set(edgeIds);
        setEdges((eds) => eds.filter(e => !idSet.has(e.id)));
    }, []);

    const copyToClipboard = useCallback((nodesToCopy) => {
        if (nodesToCopy?.length) setClipboard(nodesToCopy);
    }, []);

    const pasteFromClipboard = useCallback((offset = { x: 30, y: 30 }, nodesToPaste = null) => {
        const source = nodesToPaste ?? clipboard;
        if (!source?.length) return null;
        const now = Date.now();
        const idMap = {};
        const newNodes = source.map((n, i) => {
            const newId = `${n.data?.nodeType || 'node'}-${now}-${i}`;
            idMap[n.id] = newId;
            return {
                ...n,
                id: newId,
                position: {
                    x: (n.position?.x ?? 0) + offset.x,
                    y: (n.position?.y ?? 0) + offset.y
                },
                data: { ...n.data, status: 'idle' }
            };
        });
        setNodes((nds) => [...nds, ...newNodes]);
        return { nodes: newNodes, idMap };
    }, [clipboard]);

    const duplicateNodes = useCallback((nodesToDup) => {
        if (!nodesToDup?.length) return;
        pasteFromClipboard({ x: 30, y: 30 }, nodesToDup);
    }, [pasteFromClipboard]);

    // Upload a file
    const uploadFile = useCallback(async (file) => {
        const res = await uploadAPI.uploadCSV(file);
        const fileData = res.data;
        // Map fileId to absolute path for the ML engine
        setUploadedFiles(prev => ({ ...prev, [fileData.fileId]: fileData.path }));
        return fileData.fileId;
    }, []);

    const runPipeline = useCallback(async () => {
        if (nodes.length === 0) return;

        let currentPipelineId = pipelineId;
        
        // If no ID, save first to get one (edge case handling)
        if (!currentPipelineId) {
            const saved = await savePipeline();
            currentPipelineId = saved._id;
        }

        setExecutionState('running');
        setLogs([{ time: new Date().toLocaleTimeString(), type: 'info', message: 'Initializing enterprise execution engine...' }]);
        setResults(null);

        // Reset node statuses
        setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'running', error: null } })));

        try {
            const res = await executeAPI.run(nodes, edges, uploadedFiles, currentPipelineId);
            const data = res.data;

            // Update individual node statuses based on results
            setNodes(nds => nds.map(n => {
                const nodeRes = data.node_states?.[n.id];
                return {
                    ...n,
                    data: {
                        ...n.data,
                        status: nodeRes || 'success',
                        error: data.errors?.[n.id] || null
                    }
                };
            }));

            // Format logs correctly for the UI
            const formattedLogs = (data.logs || []).map(l => ({
                time: new Date(l.timestamp * 1000).toLocaleTimeString(),
                type: l.level === 'error' ? 'error' : l.level === 'success' ? 'success' : 'info',
                message: l.message
            }));

            setLogs(formattedLogs);
            setResults(data.results || null);
            setExecutionState(data.success ? 'completed' : 'failed');

            if (data.model_download_available) {
                setModelDownloadAvailable(true);
                setModelFileId(data.model_file_id);
            } else {
                setModelDownloadAvailable(false);
                setModelFileId(null);
            }

            return data;
        } catch (err) {
            const errMsg = err.response?.data?.error || err.message;
            setExecutionState('failed');
            setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), type: 'error', message: errMsg }]);
            setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'failed', error: 'Pipeline interrupted' } })));
            throw err;
        }
    }, [nodes, edges, uploadedFiles, pipelineId, savePipeline]);

    const loadPipeline = useCallback(async (id) => {
        isInitialLoad.current = true; // Prevent auto-save from firing during load
        const res = await pipelineAPI.get(id);
        const p = res.data.pipeline;
        
        setPipelineId(p._id);
        setPipelineName(p.name);
        setNodes(p.nodes || []);
        setEdges(p.edges || []);
        
        // Restore last run results if available
        if (p.runs && p.runs.length > 0) {
            const lastRun = p.runs[0]; // Latest run
            setResults(lastRun.metrics || null);
            setLogs(lastRun.logs || []);
            setExecutionState(lastRun.status || 'idle');
            
            // If model was generated, mark it available (simplified check)
            if (lastRun.metrics && Object.keys(lastRun.metrics).length > 0) {
                setModelDownloadAvailable(true);
                setModelFileId(lastRun.runId);
            }
        } else {
            setResults(null);
            setLogs([]);
            setExecutionState('idle');
        }
        
        setSaveStatus('saved');
    }, []);

    const clearPipeline = useCallback(() => {
        isInitialLoad.current = true;
        setNodes([]);
        setEdges([]);
        setSelectedNodeId(null);
        setPipelineName('Untitled Pipeline');
        setPipelineId(null);
        setExecutionState('idle');
        setLogs([]);
        setResults(null);
        setUploadedFiles({});
        setModelDownloadAvailable(false);
        setModelFileId(null);
        setHasDismissedOnboarding(false);
        setSaveStatus('saved');
    }, []);

    const downloadModel = useCallback(() => {
        if (!modelDownloadAvailable || !modelFileId) return;

        // Use a hidden anchor tag to trigger the browser download
        const url = `${executeAPI.baseURL}/execute/download-model/${modelFileId}`;
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `model_${modelFileId}.pkl`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [modelDownloadAvailable, modelFileId]);

    return (
        <PipelineContext.Provider value={{
            nodes, setNodes,
            edges, setEdges,
            onNodesChange, onEdgesChange,
            selectedNodeId, setSelectedNodeId,
            pipelineName, setPipelineName,
            pipelineId, setPipelineId,
            executionState, setExecutionState,
            logs, setLogs,
            results, setResults,
            uploadedFiles, setUploadedFiles,
            isLocked, setIsLocked,
            clipboard, copyToClipboard, pasteFromClipboard, duplicateNodes,
            deleteNodes, deleteEdges,
            uploadFile,
            runPipeline,
            savePipeline,
            loadPipeline,
            clearPipeline,
            downloadModel,
            modelDownloadAvailable,
            hasDismissedOnboarding, setHasDismissedOnboarding,
            saveStatus
        }}>
            {children}
        </PipelineContext.Provider>
    );
}

export const usePipeline = () => useContext(PipelineContext);
