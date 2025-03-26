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

// Import the additional node types
// Note: These imports are placeholders - make sure these components exist in your project
import ImageNode from './ImageNode'; 
import TextNode from './TextNode';
import TextInputNode from './TextInputNode';
import TextOutputNode from './TextOutputNode';

// Define custom node types for ReactFlow
const nodeTypes: NodeTypes = {
  flowNode: FlowNode,
  imageNode: ImageNode,
  textNode: TextNode,
  textInputNode: TextInputNode,
  textOutputNode: TextOutputNode,
};

// Initial nodes and edges for ReactFlow
const initialEdges: Edge[] = [];

interface IntegratedCanvasProps {
  activeTool: Tool;
}
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'flowNode',
    data: { label: 'Start' },
    position: { x: 250, y: 5 },
  },
];

export default function IntegratedCanvas({ activeTool }: IntegratedCanvasProps) {
  // Refs for canvas elements and states
  const canvasRef = useRef<HTMLDivElement>(null);          // Container div reference
  const fabricCanvasRef = useRef<HTMLCanvasElement>(null); // Fabric.js canvas element reference
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null); // Fabric.js canvas instance
  
  // ReactFlow state for nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  
  // Drawing state tracking
  const isDrawing = useRef(false);              // Tracks current drawing state
  const startPoint = useRef({ x: 0, y: 0 });    // Tracks drawing start coordinates
  const isDrawingRef = useRef(false);           // Used for history management
  const shouldSaveHistory = useRef(true);       // Controls when to save to history
  const lastSavedState = useRef<string | null>(null); // Stores last saved canvas state
  
  // === TOOL PROPERTY STATES ===
  
  // Pencil tool properties
  const [pencilColor, setPencilColor] = useState('#000000');      // Pencil stroke color
  const [pencilSize, setPencilSize] = useState(2);                // Pencil stroke width
  const [pencilOpacity, setPencilOpacity] = useState(100);        // Pencil opacity (%)
  const [pencilStyle, setPencilStyle] = useState('solid');        // Line style (solid, dashed, dotted)
  const [shadowWidth, setShadowWidth] = useState(0);              // Shadow blur amount
  const [shadowColor, setShadowColor] = useState('#000000');      // Shadow color

  // Shape and connector properties
  const [shapeType, setShapeType] = useState('rectangle');        // Current shape type
  const [shapeFill, setShapeFill] = useState('transparent');      // Shape fill color
  const [shapeStroke, setShapeStroke] = useState('#000000');      // Shape border color
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState(2);    // Shape border width
  const [connectorType, setConnectorType] = useState('line');     // Connector style (line/curve)
  const [connectorArrow, setConnectorArrow] = useState('none');   // Arrow style (none/start/end/both)

  // Text properties
  const [textFontFamily, setTextFontFamily] = useState('Arial');  // Text font family
  const [textFontSize, setTextFontSize] = useState(20);           // Text font size (px)
  const [textColor, setTextColor] = useState('#000000');          // Text color

  // Floating panel properties
  const [panelPosition, setPanelPosition] = useState({ x: 20, y: 20 }); // Panel position
  const isDraggingPanel = useRef(false);                         // Tracks if panel is being moved
  const panelRef = useRef<HTMLDivElement>(null);                 // Reference to panel element
  const dragStartPos = useRef({ x: 0, y: 0 });                   // Tracks panel drag start position
  
  // Add state for panel expansion
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  
  // Add state for flowchart node type selection
  const [flowNodeType, setFlowNodeType] = useState<string>('flowNode');
  
  // Handle panel toggle
  const togglePanel = (e: React.MouseEvent) => {
    // Only toggle if clicking on the toggle button, not when dragging the panel
    if ((e.target as HTMLElement).closest('.panel-toggle-btn')) {
      setIsPanelExpanded(!isPanelExpanded);
      e.stopPropagation(); // Prevent panel drag when clicking toggle
    }
  };

  // === EVENT HANDLERS ===
  
  // Handle panel drag events
  const handlePanelMouseDown = (e: React.MouseEvent) => {
    // Only start dragging if clicking on panel header or panel itself
    if (e.target === panelRef.current || (e.target as HTMLElement).classList.contains('panel-drag-handle')) {
      isDraggingPanel.current = true;
      // Calculate offset from panel position to mouse position
      dragStartPos.current = { x: e.clientX - panelPosition.x, y: e.clientY - panelPosition.y };
      e.preventDefault();
    }
  };
  
  const handlePanelMouseMove = (e: MouseEvent) => {
    if (isDraggingPanel.current) {
      // Update panel position based on mouse movement
      const newX = e.clientX - dragStartPos.current.x;
      const newY = e.clientY - dragStartPos.current.y;
      setPanelPosition({ x: newX, y: newY });
      e.preventDefault();
    }
  };
  
  const handlePanelMouseUp = () => {
    isDraggingPanel.current = false; // Stop dragging panel
  };
  
  // Add event listeners for panel dragging
  useEffect(() => {
    window.addEventListener('mousemove', handlePanelMouseMove);
    window.addEventListener('mouseup', handlePanelMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handlePanelMouseMove);
      window.removeEventListener('mouseup', handlePanelMouseUp);
    };
  }, []);

  // === INITIALIZE FABRIC.JS CANVAS ===
  useEffect(() => {
    if (fabricCanvasRef.current && !fabricCanvas) {
      // Create the canvas with a slight delay to ensure DOM is ready
      setTimeout(() => {
        // Initialize Fabric.js canvas
        const canvas = new fabric.Canvas(fabricCanvasRef.current!, {
          width: window.innerWidth - 64,
          height: window.innerHeight - 80,
          backgroundColor: '#ffffff', // Set white background
          isDrawingMode: false,
          renderOnAddRemove: true
        });
        
        // Setup undo/redo history system
        canvas.historyUndo = [];
        canvas.historyRedo = [];
        lastSavedState.current = JSON.stringify(canvas);
        canvas.historyUndo.push(lastSavedState.current);

        // Handle keyboard shortcuts (undo, redo, delete)
        const handleKeyboard = (e: KeyboardEvent) => {
          // Ctrl/Cmd+Z for undo
          if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
            switch (e.key.toLowerCase()) {
              case 'z':
                e.preventDefault();
                if (canvas.historyUndo && canvas.historyUndo.length > 1) {
                  // Save current state to redo stack before undoing
                  const currentState = JSON.stringify(canvas);
                  canvas.historyRedo.push(currentState);
                  
                  // Remove the last entry from undo stack (which is the current state)
                  canvas.historyUndo.pop();
                  
                  // Get the previous state
                  const prevState = canvas.historyUndo[canvas.historyUndo.length - 1];
                  
                  // Temporarily disable history saving during undo operation
                  shouldSaveHistory.current = false;
                  isDrawingRef.current = false;
                  
                  // Load the previous state
                  canvas.clear();
                  canvas.loadFromJSON(prevState, () => {
                    lastSavedState.current = prevState;
                    canvas.renderAll();
                    
                    // Re-enable history saving after a short delay
                    setTimeout(() => {
                      shouldSaveHistory.current = true;
                    }, 100);
                  });
                }
                break;
              // Ctrl/Cmd+Y for redo
              case 'y':
                e.preventDefault();
                if (canvas.historyRedo && canvas.historyRedo.length > 0) {
                  // Get the redo state
                  const redoState = canvas.historyRedo.pop();
                  
                  // Save current state to undo stack
                  const currentState = JSON.stringify(canvas);
                  canvas.historyUndo.push(currentState);
                  
                  // Temporarily disable history saving
                  shouldSaveHistory.current = false;
                  
                  // Load the redo state
                  canvas.clear();
                  canvas.loadFromJSON(redoState!, () => {
                    lastSavedState.current = redoState ?? null;
                    canvas.renderAll();
                    
                    // Re-enable history saving after a short delay
                    setTimeout(() => {
                      shouldSaveHistory.current = true;
                    }, 100);
                  });
                }
                break;
            }
          }

          // Delete/Backspace key for removing selected objects
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

        // Add history tracking event handlers
        // Save state when objects are modified
        canvas.on('object:modified', () => {
          if (shouldSaveHistory.current && !isDrawingRef.current) {
            const currentState = JSON.stringify(canvas);
            // Only save if the state has actually changed
            if (currentState !== lastSavedState.current) {
              canvas.historyUndo.push(currentState);
              canvas.historyRedo = [];
              lastSavedState.current = currentState;
            }
          }
        });

        // Save state when objects are added (except when actively drawing)
        canvas.on('object:added', () => {
          if (shouldSaveHistory.current && !isDrawingRef.current) {
            const currentState = JSON.stringify(canvas);
            // Only save if the state has actually changed
            if (currentState !== lastSavedState.current) {
              canvas.historyUndo.push(currentState);
              canvas.historyRedo = [];
              lastSavedState.current = currentState;
            }
          }
        });
        
        // Special handler for finalizing pencil/path drawing
        canvas.on('path:created', () => {
          if (shouldSaveHistory.current) {
            isDrawingRef.current = false;
            const currentState = JSON.stringify(canvas);
            if (currentState !== lastSavedState.current) {
              canvas.historyUndo.push(currentState);
              canvas.historyRedo = [];
              lastSavedState.current = currentState;
            }
          }
        });

        window.addEventListener('keydown', handleKeyboard);

        // Initialize drawing brush with defaults
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.width = 2;
        canvas.freeDrawingBrush.color = '#000000';
        
        // Handle window resize - update canvas dimensions
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
        
        // Cleanup on unmount
        return () => {
          window.removeEventListener('resize', handleResize);
          window.removeEventListener('keydown', handleKeyboard);
          canvas.dispose();
        };
      }, 100);
    }
  }, [fabricCanvas]);
  
  // === TOOL BEHAVIOR MANAGEMENT ===
  useEffect(() => {
    if (!fabricCanvas) return;
    
    // Reset canvas state for new tool
    fabricCanvas.off('mouse:down');
    fabricCanvas.off('mouse:move');
    fabricCanvas.off('mouse:up');
    fabricCanvas.isDrawingMode = false;
    
    // Show/hide ReactFlow layer based on active tool
    const reactFlowEl = document.querySelector('.react-flow-wrapper');
    if (reactFlowEl) {
      if (activeTool === 'flowchart') {
        reactFlowEl.classList.add('react-flow-active');
      } else {
        reactFlowEl.classList.remove('react-flow-active');
      }
    }
    
    // Configure tool-specific behaviors
    switch (activeTool) {
      case 'select':
        // Selection tool: enable object selection
        fabricCanvas.selection = true;
        fabricCanvas.forEachObject(obj => {
          obj.selectable = true;
        });
        break;
        
      case 'draw':
        // Drawing tool: enable freeform drawing with pencil
        fabricCanvas.isDrawingMode = true;
        if (!fabricCanvas.freeDrawingBrush) {
          fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
        }
        
        // Apply current pencil settings
        fabricCanvas.freeDrawingBrush.width = pencilSize;
        fabricCanvas.freeDrawingBrush.color = pencilColor;
        (fabricCanvas.freeDrawingBrush as any).opacity = pencilOpacity / 100;
        
        // Apply shadow settings if enabled
        if (shadowWidth > 0) {
          fabricCanvas.freeDrawingBrush.shadow = new fabric.Shadow({
            color: shadowColor,
            blur: shadowWidth,
            offsetX: 1,
            offsetY: 1
          });
        } else {
          fabricCanvas.freeDrawingBrush.shadow = null;
        }
        
        // Apply line style (solid, dashed, dotted)
        if (pencilStyle === 'dashed') {
          fabricCanvas.freeDrawingBrush.strokeDashArray = [pencilSize * 2, pencilSize];
        } else if (pencilStyle === 'dotted') {
          fabricCanvas.freeDrawingBrush.strokeDashArray = [1, pencilSize * 2];
        } else {
          fabricCanvas.freeDrawingBrush.strokeDashArray = [];
        }
        
        // Track drawing state for proper history management
        fabricCanvas.on('mouse:down', () => {
          isDrawingRef.current = true;
          // Save state before starting to draw, but only if we're in drawing mode
          if (fabricCanvas.isDrawingMode && shouldSaveHistory.current) {
            const currentState = JSON.stringify(fabricCanvas);
            // Check if we need to save a new state
            if (currentState !== lastSavedState.current) {
              fabricCanvas.historyUndo.push(currentState);
              fabricCanvas.historyRedo = [];
              lastSavedState.current = currentState;
            }
          }
        });
        
        break;
        
      case 'rectangle':
        // Rectangle tool: create rectangles by drag-drawing
        let rect: fabric.Rect;
        fabricCanvas.selection = true;
        
        // Enable selection on existing objects
        fabricCanvas.forEachObject(obj => {
          obj.selectable = true;
        });
        
        // Handle mouse down - start creating rectangle
        fabricCanvas.on('mouse:down', (o) => {
          const pointer = fabricCanvas.getPointer(o.e);
          isDrawing.current = true;
          startPoint.current = { x: pointer.x, y: pointer.y };
          isDrawingRef.current = true;
          
          rect = new fabric.Rect({
            left: startPoint.current.x,
            top: startPoint.current.y,
            width: 0,
            height: 0,
            fill: shapeFill,
            stroke: shapeStroke,
            strokeWidth: shapeStrokeWidth,
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
        
        // Handle mouse move - resize rectangle as dragging
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
        
        // Handle mouse up - finalize rectangle
        fabricCanvas.on('mouse:up', () => {
          isDrawing.current = false;
          isDrawingRef.current = false;  // Update our ref for history management
        });
        break;
        
      // Other shape tools (circle, triangle, ellipse) follow similar patterns
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
          isDrawingRef.current = true;
          
          circle = new fabric.Circle({
            left: startPoint.current.x,
            top: startPoint.current.y,
            radius: 0,
            fill: shapeFill,
            stroke: shapeStroke,
            strokeWidth: shapeStrokeWidth,
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
          isDrawingRef.current = false;
        });
        break;
        
      case 'triangle' as Tool:
        let triangle: fabric.Triangle;
        fabricCanvas.selection = true;
        fabricCanvas.forEachObject(obj => {
          obj.selectable = true;
        });
        
        fabricCanvas.on('mouse:down', (o) => {
          const pointer = fabricCanvas.getPointer(o.e);
          isDrawing.current = true;
          startPoint.current = { x: pointer.x, y: pointer.y };
          isDrawingRef.current = true;
          
          triangle = new fabric.Triangle({
            left: startPoint.current.x,
            top: startPoint.current.y,
            width: 0,
            height: 0,
            fill: shapeFill,
            stroke: shapeStroke,
            strokeWidth: shapeStrokeWidth,
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: true,
            transparentCorners: false
          });
          
          fabricCanvas.add(triangle);
          fabricCanvas.setActiveObject(triangle);
          fabricCanvas.renderAll();
        });
        
        fabricCanvas.on('mouse:move', (o) => {
          if (!isDrawing.current) return;
          
          const pointer = fabricCanvas.getPointer(o.e);
          
          if (pointer.x < startPoint.current.x) {
            triangle.set({ left: pointer.x });
          }
          
          if (pointer.y < startPoint.current.y) {
            triangle.set({ top: pointer.y });
          }
          
          triangle.set({
            width: Math.abs(pointer.x - startPoint.current.x) * 2,
            height: Math.abs(pointer.y - startPoint.current.y) * 2
          });
          
          fabricCanvas.renderAll();
        });
        
        fabricCanvas.on('mouse:up', () => {
          isDrawing.current = false;
          isDrawingRef.current = false;
        });
        break;
        
      case 'ellipse' as Tool:
        let ellipse: fabric.Ellipse;
        fabricCanvas.selection = true;
        fabricCanvas.forEachObject(obj => {
          obj.selectable = true;
        });
        
        fabricCanvas.on('mouse:down', (o) => {
          const pointer = fabricCanvas.getPointer(o.e);
          isDrawing.current = true;
          startPoint.current = { x: pointer.x, y: pointer.y };
          isDrawingRef.current = true;
          
          ellipse = new fabric.Ellipse({
            left: startPoint.current.x,
            top: startPoint.current.y,
            rx: 0,
            ry: 0,
            fill: shapeFill,
            stroke: shapeStroke,
            strokeWidth: shapeStrokeWidth,
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: true,
            transparentCorners: false
          });
          
          fabricCanvas.add(ellipse);
          fabricCanvas.setActiveObject(ellipse);
          fabricCanvas.renderAll();
        });
        
        fabricCanvas.on('mouse:move', (o) => {
          if (!isDrawing.current) return;
          
          const pointer = fabricCanvas.getPointer(o.e);
          
          const rx = Math.abs(pointer.x - startPoint.current.x) / 2;
          const ry = Math.abs(pointer.y - startPoint.current.y) / 2;
          
          if (rx > ellipse.strokeWidth && ry > ellipse.strokeWidth) {
            ellipse.set({
              rx: rx,
              ry: ry,
              left: startPoint.current.x - rx,
              top: startPoint.current.y - ry
            });
          }
          
          fabricCanvas.renderAll();
        });
        
        fabricCanvas.on('mouse:up', () => {
          isDrawing.current = false;
          isDrawingRef.current = false;
        });
        break;
        
      case 'text':
        // Text tool: add text element on click
        fabricCanvas.on('mouse:down', (o) => {
          // Create text element with current settings
          const pointer = fabricCanvas.getPointer(o.e);
          const text = new fabric.IText('Text', {
            left: pointer.x,
            top: pointer.y,
            fontFamily: textFontFamily,
            fontSize: textFontSize,
            fill: textColor
          });
          
          // Add and select text, then enter editing mode
          fabricCanvas.add(text);
          fabricCanvas.setActiveObject(text);
          text.enterEditing();
          text.selectAll();
        });
        break;
        
      case 'image':
        // Image tool: open file browser and add selected image
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.click();
        
        // Handle image selection
        fileInput.onchange = (e) => {
          const target = e.target as HTMLInputElement;
          const file = target.files?.[0];
          
          if (file) {
            const reader = new FileReader();
            reader.onload = (f) => {
              const data = f.target?.result as string;
            }
          }
        }
        
      case 'eraser':
        // Eraser tool: remove objects that intersect with eraser
        fabricCanvas.isDrawingMode = false;
        fabricCanvas.selection = false;
        const eraserRadius = 10; // Size of eraser hit area

        // Track eraser usage for history
        fabricCanvas.on('mouse:down', () => {
          isDrawing.current = true;
          isDrawingRef.current = true;
          // Save state before erasing
          if (shouldSaveHistory.current) {
            fabricCanvas.historyUndo.push(JSON.stringify(fabricCanvas));
            fabricCanvas.historyRedo = [];
          }
        });

        // Remove objects that intersect with eraser
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

        // Finish erasing
        fabricCanvas.on('mouse:up', () => {
          isDrawing.current = false;
          isDrawingRef.current = false;
        });
        break;
        
      case 'connector':
        // Connector tool: create lines/curves with optional arrows
        let line: fabric.Line | fabric.Path;
        fabricCanvas.selection = true;
        fabricCanvas.forEachObject(obj => {
          obj.selectable = true;
        });
        
        // Start drawing connector
        fabricCanvas.on('mouse:down', (o) => {
          const pointer = fabricCanvas.getPointer(o.e);
          isDrawing.current = true;
          startPoint.current = { x: pointer.x, y: pointer.y };
          isDrawingRef.current = true;
          
          if (connectorType === 'line') {
            line = new fabric.Line(
              [startPoint.current.x, startPoint.current.y, startPoint.current.x, startPoint.current.y],
              {
                stroke: shapeStroke,
                strokeWidth: shapeStrokeWidth,
                selectable: true,
                evented: true,
                hasControls: true,
                hasBorders: true,
                transparentCorners: false
              }
            );
          } else if (connectorType === 'curve') {
            // Create a curved path (initially straight)
            line = new fabric.Path(`M ${startPoint.current.x} ${startPoint.current.y} Q ${startPoint.current.x} ${startPoint.current.y} ${startPoint.current.x} ${startPoint.current.y}`, {
              fill: '',
              stroke: shapeStroke,
              strokeWidth: shapeStrokeWidth,
              selectable: true,
              evented: true,
              hasControls: true,
              hasBorders: true,
              transparentCorners: false
            });
          }
          
          fabricCanvas.add(line);
          fabricCanvas.setActiveObject(line);
          fabricCanvas.renderAll();
        });
        
        // Update connector as mouse moves
        fabricCanvas.on('mouse:move', (o) => {
          if (!isDrawing.current) return;
          
          const pointer = fabricCanvas.getPointer(o.e);
          
          if (connectorType === 'line') {
            (line as fabric.Line).set({ x2: pointer.x, y2: pointer.y });
          } else if (connectorType === 'curve') {
            // Update the curved path
            const midX = (startPoint.current.x + pointer.x) / 2;
            const midY = (startPoint.current.y + pointer.y) / 2 - 50; // Control point above the midpoint
            const pathData = `M ${startPoint.current.x} ${startPoint.current.y} Q ${midX} ${midY} ${pointer.x} ${pointer.y}`;
            (line as fabric.Path).set({ path: pathData });
          }
          
          fabricCanvas.renderAll();
        });
        
        // Finalize connector and add arrows if needed
        fabricCanvas.on('mouse:up', () => {
          isDrawing.current = false;
          isDrawingRef.current = false;
          
          // Add arrowhead if selected
          if (connectorArrow === 'end' || connectorArrow === 'both') {
            addArrowhead(line, 'end');
          }
          
          if (connectorArrow === 'start' || connectorArrow === 'both') {
            addArrowhead(line, 'start');
          }
          
          fabricCanvas.renderAll();
        });
        break;
    }
  }, [fabricCanvas, activeTool, shapeFill, shapeStroke, shapeStrokeWidth, connectorType, connectorArrow, pencilColor, pencilSize, pencilOpacity, pencilStyle, shadowWidth, shadowColor, textFontFamily, textFontSize, textColor]);
  
  // === HELPER FUNCTIONS ===
  
  // Add arrowhead to line/path connectors
  const addArrowhead = (line: fabric.Line | fabric.Path, position: 'start' | 'end') => {
    let x1, y1, x2, y2;
    
    // Get start and end points based on connector type
    if (line instanceof fabric.Line) {
      // For straight lines
      x1 = line.x1 || 0;
      y1 = line.y1 || 0;
      x2 = line.x2 || 0;
      y2 = line.y2 || 0;
    } else {
      // For curved paths
      const pathData = line.path as any[];
      if (!pathData || pathData.length < 2) return;
      
      // Get first and last points from path
      x1 = pathData[0][1];
      y1 = pathData[0][2];
      const lastCommand = pathData[pathData.length - 1];
      x2 = lastCommand[lastCommand.length - 2];
      y2 = lastCommand[lastCommand.length - 1];
    }
    
    // Calculate angle for proper arrow orientation
    const angle = position === 'end' 
      ? Math.atan2(y2 - y1, x2 - x1) 
      : Math.atan2(y1 - y2, x1 - x2);
    
    // Create triangle for arrowhead
    const arrowSize = Math.max(shapeStrokeWidth * 3, 10);
    const arrowPoint = position === 'end' ? { x: x2, y: y2 } : { x: x1, y: y1 };
    
    const arrow = new fabric.Triangle({
      left: arrowPoint.x,
      top: arrowPoint.y,
      width: arrowSize,
      height: arrowSize,
      fill: shapeStroke,
      stroke: null,
      angle: (angle * 180 / Math.PI) + 90,
      originX: 'center',
      originY: 'center',
      selectable: false
    });
    
    fabricCanvas?.add(arrow);
    
    // Group the line and arrow for easier manipulation
    const group = new fabric.Group([line, arrow], {
      selectable: true,
      hasControls: true
    });
    
    fabricCanvas?.remove(line);
    fabricCanvas?.add(group);
    fabricCanvas?.setActiveObject(group);
  };
  
  // === REACTFLOW HANDLERS ===
  
  // Handle connecting nodes in flowchart
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );
  
  // Create new node on canvas click in flowchart mode
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
          type: flowNodeType, // Use the selected node type
          position,
          data: { label: `${flowNodeType.replace('Node', '')} ${nodes.length + 1}` },
        };
        
        setNodes((nds) => [...nds, newNode]);
      }
    },
    [activeTool, nodes.length, reactFlowInstance, setNodes, flowNodeType]
  );

  // === RENDER UI ===
  return (
    <div ref={canvasRef} className="w-full h-full overflow-hidden relative">
      {/* Canvas area - contains drawing surfaces */}
      <div className="w-full h-full relative">
        {/* Fabric.js canvas layer - used for drawing tools */}
        <div className="absolute inset-0 fabric-container">
          <canvas ref={fabricCanvasRef} id="drawing-canvas" />
        </div>
        
        {/* ReactFlow layer - used for flowcharts */}
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
          </ReactFlow>
        </div>
        
        {/* Floating Tool Settings Panel - now with expand/collapse feature */}
        <div 
          ref={panelRef}
          className={`absolute bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50 transition-all duration-300 ease-in-out`}
          style={{ 
            top: `${panelPosition.y}px`, 
            left: `${panelPosition.x}px`,
            width: isPanelExpanded ? '280px' : '60px',
            height: isPanelExpanded ? 'auto' : 'auto',
            maxHeight: isPanelExpanded ? '80vh' : '60px',
          }}
          onMouseDown={handlePanelMouseDown}
        >
          {/* Panel Header - serves as drag handle */}
          <div 
            className="panel-drag-handle bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-3 text-white flex justify-between items-center cursor-move"
            onClick={togglePanel}
          >
            {isPanelExpanded ? (
              <>
                <h2 className="text-md font-semibold">
                  <span className="capitalize">{activeTool}</span> Tool Settings
                </h2>
                <div className="flex items-center gap-2">
                  <button className="panel-toggle-btn bg-white/20 p-1 rounded-full text-white hover:bg-white/30 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex w-full items-center justify-center gap-2">
                <span className="capitalize text-xs font-medium">{activeTool}</span>
                <button className="panel-toggle-btn bg-white/20 p-1 rounded-full text-white hover:bg-white/30 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          
          {/* Panel Content - only shown when expanded */}
          {isPanelExpanded && (
            <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 50px)' }}>
              {/* All existing tool settings content remains unchanged */}
              {/* Draw tool settings */}
              {activeTool === 'draw' && (
                <div className="space-y-5">
                  {/* Color selector for pencil */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-gray-700 block mb-2">Color:</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'].map(color => (
                        <button 
                          key={color}
                          onClick={() => setPencilColor(color)}
                          className="w-7 h-7 rounded-full border border-gray-300 cursor-pointer flex items-center justify-center shadow-sm hover:shadow-md transition"
                          style={{ backgroundColor: color }}
                          title={color}
                        >
                          {pencilColor === color && (
                            <span className="text-white text-xs">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center mt-2">
                      <input 
                        type="color" 
                        value={pencilColor} 
                        onChange={(e) => setPencilColor(e.target.value)} 
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                      <span className="ml-2 text-xs text-gray-600">{pencilColor}</span>
                    </div>
                  </div>
                  
                  {/* Size control for pencil */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between mb-1">
                      <label className="text-xs font-medium text-gray-700">Size:</label>
                      <span className="text-xs bg-pink-100 text-pink-800 px-2 py-0.5 rounded-full">{pencilSize}px</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => setPencilSize(Math.max(1, pencilSize - 1))}
                        className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-md flex items-center justify-center text-gray-700 transition"
                      >
                        <span>-</span>
                      </button>
                      <input 
                        type="range" 
                        min="1" 
                        max="30"
                        value={pencilSize} 
                        onChange={(e) => setPencilSize(parseInt(e.target.value))} 
                        className="flex-1"
                      />
                      <button 
                        onClick={() => setPencilSize(Math.min(30, pencilSize + 1))}
                        className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-md flex items-center justify-center text-gray-700 transition"
                      >
                        <span>+</span>
                      </button>
                    </div>
                    
                    {/* Pencil preview */}
                    <div className="mt-2 border border-gray-300 p-2 rounded flex items-center justify-center">
                      <div style={{ 
                        width: `${pencilSize * 2}px`, 
                        height: `${pencilSize * 2}px`, 
                        borderRadius: '50%', 
                        backgroundColor: pencilColor,
                        opacity: pencilOpacity / 100
                      }}></div>
                    </div>
                  </div>
                  
                  {/* Opacity control for pencil */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between mb-1">
                      <label className="text-xs font-medium text-gray-700">Opacity:</label>
                      <span className="text-xs bg-pink-100 text-pink-800 px-2 py-0.5 rounded-full">{pencilOpacity}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="100" 
                      value={pencilOpacity} 
                      onChange={(e) => setPencilOpacity(parseInt(e.target.value))} 
                      className="w-full"
                    />
                  </div>
                  
                  {/* Line style for pencil */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-gray-700 block mb-2">Style:</label>
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => setPencilStyle('solid')}
                        className={`flex-1 px-2 py-1.5 text-xs rounded-md transition ${pencilStyle === 'solid' ? 'bg-pink-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                      >
                        Solid
                      </button>
                      <button 
                        onClick={() => setPencilStyle('dashed')}
                        className={`flex-1 px-2 py-1.5 text-xs rounded-md transition ${pencilStyle === 'dashed' ? 'bg-pink-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                      >
                        Dashed
                      </button>
                      <button 
                        onClick={() => setPencilStyle('dotted')}
                        className={`flex-1 px-2 py-1.5 text-xs rounded-md transition ${pencilStyle === 'dotted' ? 'bg-pink-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                      >
                        Dotted
                      </button>
                    </div>
                  </div>
                  
                  {/* Shadow controls for pencil */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between mb-1">
                      <label className="text-xs font-medium text-gray-700">Shadow:</label>
                      <span className="text-xs bg-pink-100 text-pink-800 px-2 py-0.5 rounded-full">{shadowWidth}px</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="20" 
                      value={shadowWidth} 
                      onChange={(e) => setShadowWidth(parseInt(e.target.value))} 
                      className="w-full"
                    />
                    
                    {shadowWidth > 0 && (
                      <div className="flex items-center justify-between mt-2">
                        <label className="text-xs font-medium text-gray-700">Shadow Color:</label>
                        <input 
                          type="color" 
                          value={shadowColor} 
                          onChange={(e) => setShadowColor(e.target.value)} 
                          className="w-6 h-6 rounded cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Shape tools settings */}
              {(activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'triangle' as Tool || activeTool === 'ellipse' as Tool) && (
                <div className="space-y-5">
                  {/* Border color */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-gray-700 block mb-2">Border Color:</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'].map(color => (
                        <button 
                          key={color}
                          onClick={() => setShapeStroke(color)}
                          className="w-7 h-7 rounded-full border border-gray-300 cursor-pointer flex items-center justify-center shadow-sm hover:shadow-md transition"
                          style={{ backgroundColor: color }}
                          title={color}
                        >
                          {shapeStroke === color && (
                            <span className="text-white text-xs">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center">
                      <input 
                        type="color" 
                        value={shapeStroke} 
                        onChange={(e) => setShapeStroke(e.target.value)} 
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                      <span className="ml-2 text-xs text-gray-600">{shapeStroke}</span>
                    </div>
                  </div>
                  
                  {/* Fill color */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-gray-700 block mb-2">Fill Color:</label>
                    <div className="flex items-center mb-2">
                      <button 
                        onClick={() => setShapeFill('transparent')}
                        className={`w-7 h-7 border border-gray-300 flex items-center justify-center rounded-full mr-2 shadow-sm hover:shadow-md transition ${shapeFill === 'transparent' ? 'bg-gray-200 border-gray-400' : ''}`}
                        title="Transparent"
                      >
                        <span className="text-xs">⊘</span>
                      </button>
                      <div className="flex flex-wrap gap-2">
                        {['#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00'].map(color => (
                          <button 
                            key={color}
                            onClick={() => setShapeFill(color)}
                            className="w-7 h-7 rounded-full border border-gray-300 cursor-pointer flex items-center justify-center shadow-sm hover:shadow-md transition"
                            style={{ backgroundColor: color }}
                            title={color}
                          >
                            {shapeFill === color && (
                              <span className={color === '#ffffff' ? 'text-black text-xs' : 'text-white text-xs'}>✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                    {shapeFill !== 'transparent' && (
                      <div className="flex items-center">
                        <input 
                          type="color" 
                          value={shapeFill} 
                          onChange={(e) => setShapeFill(e.target.value)} 
                          className="w-8 h-8 rounded cursor-pointer"
                        />
                        <span className="ml-2 text-xs text-gray-600">{shapeFill}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Stroke width */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between mb-1">
                      <label className="text-xs font-medium text-gray-700">Thickness:</label>
                      <span className="text-xs bg-pink-100 text-pink-800 px-2 py-0.5 rounded-full">{shapeStrokeWidth}px</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => setShapeStrokeWidth(Math.max(1, shapeStrokeWidth - 1))}
                        className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-md flex items-center justify-center text-gray-700 transition"
                      >
                        <span>-</span>
                      </button>
                      <input 
                        type="range" 
                        min="1" 
                        max="20"
                        value={shapeStrokeWidth} 
                        onChange={(e) => setShapeStrokeWidth(parseInt(e.target.value))} 
                        className="flex-1"
                      />
                      <button 
                        onClick={() => setShapeStrokeWidth(Math.min(20, shapeStrokeWidth + 1))}
                        className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-md flex items-center justify-center text-gray-700 transition"
                      >
                        <span>+</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Shape preview */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-gray-700 block mb-2">Current Shape:</label>
                    <div className="h-20 border border-gray-300 rounded flex items-center justify-center p-2">
                      <div className={`
                        border-2 flex items-center justify-center
                        ${activeTool === 'rectangle' ? 'w-16 h-10' : ''}
                        ${activeTool === 'circle' ? 'w-12 h-12 rounded-full' : ''}
                        ${activeTool === ('triangle' as Tool) ? 'w-0 h-0 border-l-[25px] border-r-[25px] border-b-[40px] border-l-transparent border-r-transparent' : ''}
                        ${activeTool === ('ellipse' as Tool) ? 'w-16 h-10 rounded-full' : ''}
                      `}
                      style={{ 
                        borderColor: shapeStroke, 
                        borderWidth: shapeStrokeWidth,
                        backgroundColor: shapeFill
                      }}
                      >
                        {activeTool !== ('triangle' as Tool) && <span className="text-xs capitalize">{activeTool}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Connector settings */}
              {activeTool === 'connector' && (
                <div className="space-y-5">
                  {/* Line color */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-gray-700 block mb-2">Line Color:</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'].map(color => (
                        <button 
                          key={color}
                          onClick={() => setShapeStroke(color)}
                          className="w-7 h-7 rounded-full border border-gray-300 cursor-pointer flex items-center justify-center shadow-sm hover:shadow-md transition"
                          style={{ backgroundColor: color }}
                          title={color}
                        >
                          {shapeStroke === color && (
                            <span className="text-white text-xs">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center">
                      <input 
                        type="color" 
                        value={shapeStroke} 
                        onChange={(e) => setShapeStroke(e.target.value)} 
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                      <span className="ml-2 text-xs text-gray-600">{shapeStroke}</span>
                    </div>
                  </div>
                  
                  {/* Line width */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between mb-1">
                      <label className="text-xs font-medium text-gray-700">Thickness:</label>
                      <span className="text-xs bg-pink-100 text-pink-800 px-2 py-0.5 rounded-full">{shapeStrokeWidth}px</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => setShapeStrokeWidth(Math.max(1, shapeStrokeWidth - 1))}
                        className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-md flex items-center justify-center text-gray-700 transition"
                      >
                        <span>-</span>
                      </button>
                      <input 
                        type="range" 
                        min="1" 
                        max="10"
                        value={shapeStrokeWidth} 
                        onChange={(e) => setShapeStrokeWidth(parseInt(e.target.value))} 
                        className="flex-1"
                      />
                      <button 
                        onClick={() => setShapeStrokeWidth(Math.min(10, shapeStrokeWidth + 1))}
                        className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-md flex items-center justify-center text-gray-700 transition"
                      >
                        <span>+</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Line type */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-gray-700 block mb-2">Line Type:</label>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => setConnectorType('line')}
                        className={`flex-1 px-2 py-1.5 text-xs rounded-md transition ${connectorType === 'line' ? 'bg-pink-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                      >
                        Straight
                      </button>
                      <button 
                        onClick={() => setConnectorType('curve')}
                        className={`flex-1 px-2 py-1.5 text-xs rounded-md transition ${connectorType === 'curve' ? 'bg-pink-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                      >
                        Curved
                      </button>
                    </div>
                  </div>
                  
                  {/* Arrow type */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-gray-700 block mb-2">Arrow Style:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setConnectorArrow('none')}
                        className={`px-2 py-1.5 text-xs rounded-md transition ${connectorArrow === 'none' ? 'bg-pink-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                      >
                        No Arrow
                      </button>
                      <button 
                        onClick={() => setConnectorArrow('end')}
                        className={`px-2 py-1.5 text-xs rounded-md transition ${connectorArrow === 'end' ? 'bg-pink-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                      >
                        End Arrow
                      </button>
                      <button 
                        onClick={() => setConnectorArrow('start')}
                        className={`px-2 py-1.5 text-xs rounded-md transition ${connectorArrow === 'start' ? 'bg-pink-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                      >
                        Start Arrow
                      </button>
                      <button 
                        onClick={() => setConnectorArrow('both')}
                        className={`px-2 py-1.5 text-xs rounded-md transition ${connectorArrow === 'both' ? 'bg-pink-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                      >
                        Both Ends
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Text tool settings */}
              {activeTool === 'text' && (
                <div className="space-y-5">
                  {/* Font Family */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-gray-700 block mb-2">Font Family:</label>
                    <select 
                      value={textFontFamily} 
                      onChange={(e) => setTextFontFamily(e.target.value)}
                      className="w-full p-1.5 text-sm border border-gray-300 rounded focus:border-pink-500 focus:ring focus:ring-pink-200 focus:outline-none"
                    >
                      <option value="Arial">Arial</option>
                      <option value="Helvetica">Helvetica</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Verdana">Verdana</option>
                      <option value="Impact">Impact</option>
                      <option value="Comic Sans MS">Comic Sans MS</option>
                    </select>
                  </div>
                  
                  {/* Font Size */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between mb-1">
                      <label className="text-xs font-medium text-gray-700">Font Size:</label>
                      <span className="text-xs bg-pink-100 text-pink-800 px-2 py-0.5 rounded-full">{textFontSize}px</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => setTextFontSize(Math.max(8, textFontSize - 2))}
                        className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-md flex items-center justify-center text-gray-700 transition"
                      >
                        <span>-</span>
                      </button>
                      <input 
                        type="range" 
                        min="8" 
                        max="72"
                        value={textFontSize} 
                        onChange={(e) => setTextFontSize(parseInt(e.target.value))} 
                        className="flex-1"
                      />
                      <button 
                        onClick={() => setTextFontSize(Math.min(72, textFontSize + 2))}
                        className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-md flex items-center justify-center text-gray-700 transition"
                      >
                        <span>+</span>
                      </button>
                    </div>
                    
                    {/* Quick size buttons */}
                    <div className="flex justify-between mt-2">
                      {[12, 16, 20, 24, 36].map(size => (
                        <button
                          key={size}
                          onClick={() => setTextFontSize(size)}
                          className={`px-2 py-1 text-xs rounded transition ${textFontSize === size ? 'bg-pink-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Text Color */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-gray-700 block mb-2">Text Color:</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'].map(color => (
                        <button 
                          key={color}
                          onClick={() => setTextColor(color)}
                          className="w-7 h-7 rounded-full border border-gray-300 cursor-pointer flex items-center justify-center shadow-sm hover:shadow-md transition"
                          style={{ backgroundColor: color }}
                          title={color}
                        >
                          {textColor === color && (
                            <span className="text-white text-xs">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center">
                      <input 
                        type="color" 
                        value={textColor} 
                        onChange={(e) => setTextColor(e.target.value)} 
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                      <span className="ml-2 text-xs text-gray-600">{textColor}</span>
                    </div>
                  </div>
                  
                  {/* Font Preview */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-gray-700 block mb-2">Preview:</label>
                    <div 
                      className="border border-gray-300 rounded p-3 text-center"
                      style={{ 
                        fontFamily: textFontFamily, 
                        fontSize: `${Math.min(32, textFontSize)}px`, 
                        color: textColor 
                      }}
                    >
                      Sample Text
                    </div>
                  </div>
                </div>
              )}
              
              {/* Eraser settings */}
              {activeTool === 'eraser' && (
                <div className="space-y-5">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-center mb-2">
                      <div className="mb-2 text-xs text-gray-500">Drag over objects to erase them</div>
                      <div className="rounded-full mx-auto mb-2 w-16 h-16 border-2 border-dashed border-gray-400 flex items-center justify-center">
                        <span className="text-xs text-gray-500">Eraser</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Updated Flowchart settings with node type selection */}
              {activeTool === 'flowchart' && (
                <div className="space-y-5">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-gray-700 block mb-2">Node Type:</label>
                    <select 
                      value={flowNodeType} 
                      onChange={(e) => setFlowNodeType(e.target.value)}
                      className="w-full p-1.5 text-sm border border-gray-300 rounded focus:border-pink-500 focus:ring focus:ring-pink-200 focus:outline-none mb-3"
                    >
                      <option value="flowNode">Standard Flow</option>
                      <option value="imageNode">Image</option>
                      <option value="textNode">Text</option>
                      <option value="textInputNode">Text Input</option>
                      <option value="textOutputNode">Text Output</option>
                    </select>
                    
                    {/* Node Type Preview */}
                    <div className="border border-gray-300 rounded p-3 flex items-center justify-center mb-3">
                      <div className={`
                        w-16 h-12 rounded-md border-2 border-gray-500 flex items-center justify-center
                        ${flowNodeType === 'flowNode' ? 'bg-blue-100' : ''}
                        ${flowNodeType === 'imageNode' ? 'bg-green-100' : ''}
                        ${flowNodeType === 'textNode' ? 'bg-yellow-100' : ''}
                        ${flowNodeType === 'textInputNode' ? 'bg-purple-100' : ''}
                        ${flowNodeType === 'textOutputNode' ? 'bg-red-100' : ''}
                      `}>
                        <span className="text-xs">{flowNodeType.replace('Node', '')}</span>
                      </div>
                    </div>
                    
                    <div className="border border-gray-300 rounded p-3 text-center">
                      <div className="text-xs text-gray-600">Click on canvas to add nodes</div>
                      <div className="text-xs text-gray-600 mt-1">Connect nodes by dragging from one node's handles to another</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Select/Image tools - simple instruction messages */}
              {(activeTool === 'select' || activeTool === 'image') && (
                <div className="space-y-5">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-center">
                      <p className="text-xs text-gray-600">
                        {activeTool === 'select' && "Click on objects to select and manipulate them."}
                        {activeTool === 'image' && "Click on the canvas to add an image."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Tool Indicator - shows active tool when panel is collapsed */}
        {!isPanelExpanded && (
          <div className="absolute bottom-4 left-4 bg-white rounded-full px-3 py-1.5 shadow-lg z-40 text-sm font-medium border border-gray-200">
            <span className="capitalize">{activeTool}</span> Tool Active
          </div>
        )}
      </div>
    </div>
  );
}
