import { useCallback, useRef, useState, useEffect } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    ControlButton,
    MiniMap,
    addEdge,
    useReactFlow,
    reconnectEdge,
    ConnectionLineType,
    MarkerType,
    SelectionMode
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Maximize2, Minimize2 } from 'lucide-react';
import { usePipeline } from '../context/PipelineContext';
import CustomNode from './CustomNode';
import CustomEdge from './CustomEdge';
import NodeContextMenu from './NodeContextMenu';
import EdgeContextMenu from './EdgeContextMenu';
import Onboarding from './Onboarding';
import { NODE_TYPES } from '../utils/nodeDefinitions';

const nodeTypes = { custom: CustomNode };
const edgeTypes = { default: CustomEdge };

const connectionLineStyle = {
    stroke: '#0ea5e9',
    strokeWidth: 3,
};

const defaultEdgeOptions = {
    type: 'default',
    markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#0ea5e9',
    },
};

// Helper: check if edge already exists
function isDuplicateEdge(edges, source, target, sourceHandle, targetHandle) {
    return edges.some(
        (e) =>
            e.source === source &&
            e.target === target &&
            (e.sourceHandle ?? null) === (sourceHandle ?? null) &&
            (e.targetHandle ?? null) === (targetHandle ?? null)
    );
}

// Helper: generate stable edge id
function getEdgeId(source, target, sourceHandle, targetHandle) {
    return `e-${source}-${sourceHandle || 'val'}-${target}-${targetHandle || 'val'}`;
}

export default function PipelineCanvas() {
    const reactFlowWrapper = useRef(null);
    const reactFlowInstance = useReactFlow();

    const {
        nodes = [],
        setNodes,
        edges = [],
        setEdges,
        onNodesChange,
        onEdgesChange,
        setSelectedNodeId,
        executionState,
        isLocked,
        setIsLocked,
        copyToClipboard,
        pasteFromClipboard,
        duplicateNodes,
        deleteNodes,
        deleteEdges,
    } = usePipeline();

    const [isConnecting, setIsConnecting] = useState(false);
    const [contextMenu, setContextMenu] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Connection validation
    const isValidConnection = useCallback(
        (connection) => {
            if (!connection?.source || !connection?.target) return false;
            if (connection.source === connection.target) return false;
            if (isLocked) return false;
            if (isDuplicateEdge(edges, connection.source, connection.target, connection.sourceHandle, connection.targetHandle)) {
                return false;
            }

            const sourceNode = nodes.find(n => n.id === connection.source);
            const targetNode = nodes.find(n => n.id === connection.target);
            if (!sourceNode || !targetNode) return false;

            const sourceDef = NODE_TYPES[sourceNode.data.nodeType];
            const targetDef = NODE_TYPES[targetNode.data.nodeType];

            if (!sourceDef || !targetDef) return false;

            // Validate based on common keys in inputs/outputs
            const hasCommonKey = sourceDef.outputs.some(outputKey => 
                targetDef.inputs.includes(outputKey)
            );

            if (!hasCommonKey) {
                console.warn(`[Pipeline] Invalid connection: ${sourceDef.label} outputs [${sourceDef.outputs}] do not match ${targetDef.label} inputs [${targetDef.inputs}]`);
                return false;
            }

            return true;
        },
        [edges, isLocked, nodes]
    );

    const onConnect = useCallback(
        (params) => {
            if (!isValidConnection(params)) return;
            setEdges((eds) => {
                const filtered = eds.filter(
                    (e) => !(e.target === params.target && (e.targetHandle ?? null) === (params.targetHandle ?? null))
                );
                return addEdge(
                    {
                        ...params,
                        type: 'default',
                        id: getEdgeId(params.source, params.target, params.sourceHandle, params.targetHandle)
                    },
                    filtered
                );
            });
        },
        [setEdges, isValidConnection]
    );

    const onEdgeUpdate = useCallback(
        (oldEdge, newConnection) => {
            if (!isValidConnection(newConnection)) return;
            setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
        },
        [setEdges, isValidConnection]
    );

    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event) => {
            event.preventDefault();
            const type = event.dataTransfer.getData('application/reactflow');
            if (!type) return;

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const nodeDef = NODE_TYPES[type];
            if (!nodeDef) return;

            const newNodeId = `${type}-${Date.now()}`;
            const newNode = {
                id: newNodeId,
                type: 'custom',
                position,
                data: {
                    label: nodeDef.label,
                    nodeType: type,
                    icon: nodeDef.icon,
                    category: nodeDef.category,
                    description: nodeDef.description,
                    inputs: nodeDef.inputs,
                    outputs: nodeDef.outputs,
                    config: Object.keys(nodeDef.config || {}).reduce((acc, key) => ({ ...acc, [key]: '' }), {}),
                    status: 'idle',
                },
            };

            setNodes((nds) => [...nds, newNode]);
        },
        [reactFlowInstance, setNodes]
    );

    const onConnectStart = useCallback(() => setIsConnecting(true), []);
    const onConnectEnd = useCallback(() => setIsConnecting(false), []);

    const onNodeClick = useCallback((_, node) => setSelectedNodeId(node.id), [setSelectedNodeId]);
    const onPaneClick = useCallback(() => setSelectedNodeId(null), [setSelectedNodeId]);

    const onNodeContextMenu = useCallback(
        (event, node) => {
            event.preventDefault();
            if (isLocked) return;
            setContextMenu({ type: 'node', x: event.clientX, y: event.clientY, target: node });
        },
        [isLocked]
    );

    const onEdgeContextMenu = useCallback(
        (event, edge) => {
            event.preventDefault();
            if (isLocked) return;
            setContextMenu({ type: 'edge', x: event.clientX, y: event.clientY, target: edge });
        },
        [isLocked]
    );

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (isLocked) return;
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const mod = isMac ? e.metaKey : e.ctrlKey;

            if (e.key === 'Backspace' || e.key === 'Delete') {
                const selectedNodes = nodes.filter(n => n.selected).map(n => n.id);
                if (selectedNodes.length) deleteNodes(selectedNodes);
                const selectedEdges = edges.filter(e => e.selected).map(e => e.id);
                if (selectedEdges.length) deleteEdges(selectedEdges);
                return;
            }

            if (!mod) return;
            if (e.key === 'c') {
                const selected = nodes.filter((n) => n.selected);
                if (selected.length) copyToClipboard(selected);
            } else if (e.key === 'v') {
                pasteFromClipboard({ x: 30, y: 30 });
            } else if (e.key === 'd') {
                const selected = nodes.filter((n) => n.selected);
                if (selected.length) duplicateNodes(selected);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isLocked, nodes, edges, copyToClipboard, pasteFromClipboard, duplicateNodes, deleteNodes, deleteEdges]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            reactFlowWrapper.current.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const styledEdges = edges.map((edge) => ({
        ...edge,
        animated: executionState === 'running',
    }));

    return (
        <div className="flex-1 h-full relative overflow-hidden bg-[#f1f5f9]" ref={reactFlowWrapper}>
            <ReactFlow
                nodes={nodes}
                edges={styledEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onEdgeUpdate={onEdgeUpdate}
                onConnectStart={onConnectStart}
                onConnectEnd={onConnectEnd}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                onNodeContextMenu={onNodeContextMenu}
                onEdgeContextMenu={onEdgeContextMenu}
                isValidConnection={isValidConnection}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                nodesDraggable={!isLocked}
                nodesConnectable={!isLocked}
                elementsSelectable={!isLocked}
                edgesReconnectable={!isLocked}
                deleteKeyCode={null} // Handled by manual listener for more control
                selectionMode={SelectionMode.Partial}
                selectionOnDrag
                fitView
                fitViewOptions={{ maxZoom: 0.8 }}
                defaultViewport={{ x: 50, y: 50, zoom: 0.75 }}
                connectionLineStyle={connectionLineStyle}
                connectionLineType={ConnectionLineType.Bezier}
                defaultEdgeOptions={defaultEdgeOptions}
                snapToGrid
                snapGrid={[20, 20]}
                className={`transition-colors duration-500 ${isConnecting ? 'bg-[#2563eb]/5' : ''}`}
            >
                <Background
                    variant="dots"
                    gap={24}
                    size={1.5}
                    color="rgba(0, 0, 0, 0.05)"
                />

                <Controls
                    showInteractive={true}
                    onInteractiveChange={(interactive) => setIsLocked(!interactive)}
                    orientation="horizontal"
                    className="!flex !flex-row !gap-1 !bg-white !shadow-xl !border-black/5 !rounded-lg !p-1 !bottom-4 !left-4"
                >
                    <ControlButton onClick={toggleFullscreen} title="Toggle Fullscreen">
                        {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                    </ControlButton>
                </Controls>

                <MiniMap
                    nodeColor={(n) => {
                        const cat = n.data?.category;
                        if (cat === 'input') return '#2563eb';
                        if (cat === 'prep') return '#7c3aed';
                        if (cat === 'model') return '#d97706';
                        if (cat === 'eval') return '#059669';
                        return '#475569';
                    }}
                    maskColor="rgba(248, 250, 252, 0.8)"
                    className="!bg-[#ffffff] !border-black/5 !rounded-xl !shadow-2xl !bottom-4 !right-4 overflow-hidden"
                    style={{ width: 180, height: 110 }}
                />
            </ReactFlow>

            {isConnecting && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 px-6 py-2 bg-[#2563eb]/5 border border-[#2563eb]/20 text-[#2563eb] text-[11px] font-bold rounded-full shadow-lg backdrop-blur-md uppercase tracking-[0.15em] border-black/5">
                    Establishing Data Flow Link...
                </div>
            )}

            {contextMenu?.type === 'node' && (
                <NodeContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onDelete={() => contextMenu.target && deleteNodes([contextMenu.target.id])}
                    onClose={() => setContextMenu(null)}
                />
            )}
            {contextMenu?.type === 'edge' && (
                <EdgeContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onDelete={() => contextMenu.target && deleteEdges([contextMenu.target.id])}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </div>
    );
}
