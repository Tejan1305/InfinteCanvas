'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import ReactFlow, {
  addEdge,
  Background,
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

interface IntegratedCanvasProps {
  activeTool: Tool;
}

export default function IntegratedCanvas({ activeTool }: IntegratedCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const isDrawing = useRef(false);
  const startPoint = useRef({ x: 0, y: 0 });
  
  // Initialize Fabric.js canvas
  useEffect(() => {
    if (fabricCanvasRef.current && !fabricCanvas) {
      // Create the canvas with a slight delay to ensure DOM is ready
      setTimeout(() => {
        const canvas = new fabric.Canvas(fabricCanvasRef.current!, {
          width: window.innerWidth - 64,
          height: window.innerHeight - 80,
          backgroundColor: '#ffffff', // Set white background
          isDrawingMode: false,
          renderOnAddRemove: true
        });
        
        // Initialize history arrays
        canvas.historyUndo = [];
        canvas.historyRedo = [];

        // Save initial state
        canvas.historyUndo.push(JSON.stringify(canvas));

        // Handle keyboard shortcuts
        const handleKeyboard = (e: KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
            switch (e.key.toLowerCase()) {
              case 'z':
                e.preventDefault();
                if (canvas.historyUndo && canvas.historyUndo.length > 1) {
                  canvas.historyRedo.push(canvas.historyUndo.pop()!);
                  const prevState = canvas.historyUndo[canvas.historyUndo.length - 1];
                  canvas.loadFromJSON(prevState, () => {
                    canvas.renderAll();
                  });
                }
                break;
              case 'y':
                e.preventDefault();
                if (canvas.historyRedo && canvas.historyRedo.length > 0) {
                  const nextState = canvas.historyRedo.pop();
                  canvas.loadFromJSON(nextState, () => {
                    canvas.historyUndo.push(nextState!);
                    canvas.renderAll();
                  });
                }
                break;
            }
          }

          // Delete key
          if (e.key === 'Delete' || e.key === 'Backspace') {
            const activeObject = canvas.getActiveObject();
            if (activeObject) {
              canvas.remove(activeObject);
              canvas.historyUndo.push(JSON.stringify(canvas));
              canvas.historyRedo = [];
              canvas.renderAll();
            }
          }
        };

        // Save state after each modification
        canvas.on('object:modified', () => {
          canvas.historyUndo.push(JSON.stringify(canvas));
          canvas.historyRedo = [];
        });

        canvas.on('object:added', () => {
          canvas.historyUndo.push(JSON.stringify(canvas));
          canvas.historyRedo = [];
        });

        window.addEventListener('keydown', handleKeyboard);

        // Initialize freeDrawingBrush to avoid null reference errors
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.width = 2;
        canvas.freeDrawingBrush.color = '#000000';
        
        // Handle window resize
        const handleResize = () => {
          canvas.setDimensions({
            width: window.innerWidth - 64,
            height: window.innerHeight - 80
          });
          canvas.renderAll();
        };
        
        window.addEventListener('resize', handleResize);
        setFabricCanvas(canvas);
        
        // Force initial render
        canvas.renderAll();
        
        return () => {
          window.removeEventListener('resize', handleResize);
          window.removeEventListener('keydown', handleKeyboard);
          canvas.dispose();
        };
      }, 100);
    }
  }, [fabricCanvas]);
  
  // Handle fabric.js tool changes
  useEffect(() => {
    if (!fabricCanvas) return;
    
    // Clear all event listeners
    fabricCanvas.off('mouse:down');
    fabricCanvas.off('mouse:move');
    fabricCanvas.off('mouse:up');
    
    // Reset drawing mode
    fabricCanvas.isDrawingMode = false;
    
    // Toggle visibility/interaction of React Flow based on active tool
    const reactFlowEl = document.querySelector('.react-flow-wrapper');
    if (reactFlowEl) {
      if (activeTool === 'flowchart') {
        reactFlowEl.classList.add('react-flow-active');
      } else {
        reactFlowEl.classList.remove('react-flow-active');
      }
    }
    
    // Switch statement functionality as in the original DrawingCanvas
    switch (activeTool) {
      case 'select':
        fabricCanvas.selection = true;
        fabricCanvas.forEachObject(obj => {
          obj.selectable = true;
        });
        break;
        
      case 'draw':
        fabricCanvas.isDrawingMode = true;
        if (!fabricCanvas.freeDrawingBrush) {
          fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
        }
        fabricCanvas.freeDrawingBrush.width = 2;
        fabricCanvas.freeDrawingBrush.color = '#000000';
        break;
        
      case 'rectangle':
        let rect: fabric.Rect;
        fabricCanvas.selection = true;
        fabricCanvas.forEachObject(obj => {
          obj.selectable = true;
        });
        
        fabricCanvas.on('mouse:down', (o) => {
          const pointer = fabricCanvas.getPointer(o.e);
          isDrawing.current = true;
          startPoint.current = { x: pointer.x, y: pointer.y };
          
          rect = new fabric.Rect({
            left: startPoint.current.x,
            top: startPoint.current.y,
            width: 0,
            height: 0,
            fill: 'transparent',
            stroke: '#000000',
            strokeWidth: 2,
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: true,
            transparentCorners: false
          });
          
          fabricCanvas.add(rect);
          fabricCanvas.setActiveObject(rect);
          fabricCanvas.renderAll();
        });
        
        fabricCanvas.on('mouse:move', (o) => {
          if (!isDrawing.current) return;
          
          const pointer = fabricCanvas.getPointer(o.e);
          
          if (pointer.x < startPoint.current.x) {
            rect.set({ left: pointer.x });
          }
          
          if (pointer.y < startPoint.current.y) {
            rect.set({ top: pointer.y });
          }
          
          rect.set({
            width: Math.abs(pointer.x - startPoint.current.x),
            height: Math.abs(pointer.y - startPoint.current.y)
          });
          
          fabricCanvas.renderAll();
        });
        
        fabricCanvas.on('mouse:up', () => {
          isDrawing.current = false;
        });
        break;
        
      case 'circle':
        let circle: fabric.Circle;
        fabricCanvas.selection = true;
        fabricCanvas.forEachObject(obj => {
          obj.selectable = true;
        });
        
        fabricCanvas.on('mouse:down', (o) => {
          const pointer = fabricCanvas.getPointer(o.e);
          isDrawing.current = true;
          startPoint.current = { x: pointer.x, y: pointer.y };
          
          circle = new fabric.Circle({
            left: startPoint.current.x,
            top: startPoint.current.y,
            radius: 0,
            fill: 'transparent',
            stroke: '#000000',
            strokeWidth: 2,
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: true,
            transparentCorners: false
          });
          
          fabricCanvas.add(circle);
          fabricCanvas.setActiveObject(circle);
        });
        
        fabricCanvas.on('mouse:move', (o) => {
          if (!isDrawing.current) return;
          
          const pointer = fabricCanvas.getPointer(o.e);
          const radius = Math.sqrt(
            Math.pow(pointer.x - startPoint.current.x, 2) + 
            Math.pow(pointer.y - startPoint.current.y, 2)
          ) / 2;
          
          circle.set({
            radius: radius,
            left: startPoint.current.x - radius,
            top: startPoint.current.y - radius
          });
          
          fabricCanvas.renderAll();
        });
        
        fabricCanvas.on('mouse:up', () => {
          isDrawing.current = false;
        });
        break;
        
      case 'text':
        fabricCanvas.on('mouse:down', (o) => {
          const pointer = fabricCanvas.getPointer(o.e);
          const text = new fabric.IText('Text', {
            left: pointer.x,
            top: pointer.y,
            fontFamily: 'Arial',
            fontSize: 20,
            fill: '#000000'
          });
          
          fabricCanvas.add(text);
          fabricCanvas.setActiveObject(text);
          text.enterEditing();
          text.selectAll();
        });
        break;
        
      case 'image':
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.click();
        
        fileInput.onchange = (e) => {
          const target = e.target as HTMLInputElement;
          const file = target.files?.[0];
          
          if (file) {
            const reader = new FileReader();
            reader.onload = (f) => {
              const data = f.target?.result as string;
              
              fabric.Image.fromURL(data, (img: fabric.Image) => {
                img.scale(0.5);
                fabricCanvas.add(img);
                fabricCanvas.centerObject(img);
                fabricCanvas.setActiveObject(img);
                fabricCanvas.renderAll();
              }, {
                crossOrigin: 'anonymous'
              });
            };
            reader.readAsDataURL(file);
          }
        };
        break;
        
      case 'eraser':
        fabricCanvas.isDrawingMode = false;
        fabricCanvas.selection = false;
        const eraserRadius = 10; // Size of eraser hit area

        fabricCanvas.on('mouse:down', () => {
          isDrawing.current = true;
        });

        fabricCanvas.on('mouse:move', (options) => {
          if (!isDrawing.current) return;
          
          const pointer = fabricCanvas.getPointer(options.e);
          const objects = fabricCanvas.getObjects();
          
          for (let i = objects.length - 1; i >= 0; i--) {
            const obj = objects[i];
            const objBounds = obj.getBoundingRect();
            
            // Check if pointer is within object bounds plus eraser radius
            if (
              pointer.x >= objBounds.left - eraserRadius &&
              pointer.x <= objBounds.left + objBounds.width + eraserRadius &&
              pointer.y >= objBounds.top - eraserRadius &&
              pointer.y <= objBounds.top + objBounds.height + eraserRadius
            ) {
              fabricCanvas.remove(obj);
            }
          }
          fabricCanvas.renderAll();
        });

        fabricCanvas.on('mouse:up', () => {
          isDrawing.current = false;
        });
        break;
        
      case 'connector':
        let line: fabric.Line;
        fabricCanvas.selection = true;
        fabricCanvas.forEachObject(obj => {
          obj.selectable = true;
        });
        
        fabricCanvas.on('mouse:down', (o) => {
          const pointer = fabricCanvas.getPointer(o.e);
          isDrawing.current = true;
          startPoint.current = { x: pointer.x, y: pointer.y };
          
          line = new fabric.Line(
            [startPoint.current.x, startPoint.current.y, startPoint.current.x, startPoint.current.y],
            {
              stroke: '#000000',
              strokeWidth: 2,
              selectable: true,
              evented: true,
              hasControls: true,
              hasBorders: true,
              transparentCorners: false
            }
          );
          
          fabricCanvas.add(line);
          fabricCanvas.setActiveObject(line);
          fabricCanvas.renderAll();
        });
        
        fabricCanvas.on('mouse:move', (o) => {
          if (!isDrawing.current) return;
          
          const pointer = fabricCanvas.getPointer(o.e);
          line.set({ x2: pointer.x, y2: pointer.y });
          fabricCanvas.renderAll();
        });
        
        fabricCanvas.on('mouse:up', () => {
          isDrawing.current = false;
        });
        break;
    }
  }, [fabricCanvas, activeTool]);
  
  // Handle ReactFlow operations
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );
  
  // Handle node creation on click for ReactFlow
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (activeTool === 'flowchart' && reactFlowInstance) {
        const { top, left } = canvasRef.current?.getBoundingClientRect() || { top: 0, left: 0 };
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
    <div ref={canvasRef} className="w-full h-full overflow-hidden relative">
      {/* Fabric.js canvas */}
      <div className="absolute inset-0 fabric-container">
        <canvas ref={fabricCanvasRef} id="drawing-canvas" />
      </div>
      
      {/* ReactFlow layer */}
      <div className="absolute inset-0 react-flow-wrapper">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          onPaneClick={onPaneClick}
          deleteKeyCode="Delete"
          selectionKeyCode="Shift"
          multiSelectionKeyCode="Control"
          fitView
          style={{ background: 'transparent' }}
        >
          <Controls />
          {/* No background */}
        </ReactFlow>
      </div>
    </div>
  );
}
