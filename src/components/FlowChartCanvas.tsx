'use client';

import { useCallback, useState } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  BackgroundVariant,
  Connection,
  Controls,
  Edge,
  Node,
  NodeTypes,
  useEdgesState,
  useNodesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Tool } from '@/types/whiteboard';
import FlowNode from './FlowNode';

// Define custom node types
const nodeTypes: NodeTypes = {
  flowNode: FlowNode,
};

// Initial nodes and edges
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'flowNode',
    data: { label: 'Start' },
    position: { x: 250, y: 5 },
  },
];

const initialEdges: Edge[] = [];

interface FlowChartCanvasProps {
  activeTool: Tool;
}

export default function FlowChartCanvas({ activeTool }: FlowChartCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  
  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );
  
  // Handle node creation on click
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (activeTool === 'rectangle') {
        // Only add node when rectangle tool is active
        const { top, left } = (event.target as Element).getBoundingClientRect();
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX - left,
          y: event.clientY - top,
        });
        
        const newNode: Node = {
          id: `node_${nodes.length + 1}`,
          type: 'flowNode',
          position,
          data: { label: `Node ${nodes.length + 1}` },
        };
        
        setNodes((nds) => [...nds, newNode]);
      }
    },
    [activeTool, nodes.length, reactFlowInstance, setNodes]
  );
  
  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        nodeTypes={nodeTypes}
        onPaneClick={activeTool === 'rectangle' ? onPaneClick : undefined}
        deleteKeyCode="Delete"
        selectionKeyCode="Shift"
        multiSelectionKeyCode="Control"
        fitView
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}