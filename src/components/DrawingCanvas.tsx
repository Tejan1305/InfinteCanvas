'use client';

import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { Tool } from '@/types/whiteboard';

interface DrawingCanvasProps {
  activeTool: Tool;
}

export default function DrawingCanvas({ activeTool }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const isDrawing = useRef(false);
  const startPoint = useRef({ x: 0, y: 0 });

  // Initialize canvas
  useEffect(() => {
    if (canvasRef.current && !canvas) {
      setTimeout(() => {
        const fabricCanvas = new fabric.Canvas(canvasRef.current!, {
          width: window.innerWidth - 64,
          height: window.innerHeight - 80,
          backgroundColor: '#ffffff',
          isDrawingMode: false,
          renderOnAddRemove: true
        });

        // Initialize history arrays
        fabricCanvas.historyUndo = [];
        fabricCanvas.historyRedo = [];

        // Save initial state
        fabricCanvas.historyUndo.push(JSON.stringify(fabricCanvas));

        // Handle keyboard shortcuts
        const handleKeyboard = (e: KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
            switch (e.key.toLowerCase()) {
              case 'z':
                e.preventDefault();
                if (fabricCanvas.historyUndo && fabricCanvas.historyUndo.length > 1) {
                  fabricCanvas.historyRedo.push(fabricCanvas.historyUndo.pop()!);
                  const prevState = fabricCanvas.historyUndo[fabricCanvas.historyUndo.length - 1];
                  fabricCanvas.loadFromJSON(prevState, () => {
                    fabricCanvas.renderAll();
                  });
                }
                break;
              case 'y':
                e.preventDefault();
                if (fabricCanvas.historyRedo && fabricCanvas.historyRedo.length > 0) {
                  const nextState = fabricCanvas.historyRedo.pop();
                  fabricCanvas.loadFromJSON(nextState, () => {
                    fabricCanvas.historyUndo.push(nextState!);
                    fabricCanvas.renderAll();
                  });
                }
                break;
            }
          }

          // Delete key
          if (e.key === 'Delete' || e.key === 'Backspace') {
            const activeObject = fabricCanvas.getActiveObject();
            if (activeObject) {
              fabricCanvas.remove(activeObject);
              fabricCanvas.historyUndo.push(JSON.stringify(fabricCanvas));
              fabricCanvas.historyRedo = [];
              fabricCanvas.renderAll();
            }
          }
        };

        // Save state after each modification
        fabricCanvas.on('object:modified', () => {
          fabricCanvas.historyUndo.push(JSON.stringify(fabricCanvas));
          fabricCanvas.historyRedo = [];
        });

        fabricCanvas.on('object:added', () => {
          fabricCanvas.historyUndo.push(JSON.stringify(fabricCanvas));
          fabricCanvas.historyRedo = [];
        });

        window.addEventListener('keydown', handleKeyboard);
        
        // Handle window resize
        const handleResize = () => {
          fabricCanvas.setDimensions({
            width: window.innerWidth - 64,
            height: window.innerHeight - 80
          });
          fabricCanvas.renderAll();
        };
        
        window.addEventListener('resize', handleResize);
        setCanvas(fabricCanvas);
        
        // Force initial render
        fabricCanvas.renderAll();
        
        return () => {
          window.removeEventListener('resize', handleResize);
          window.removeEventListener('keydown', handleKeyboard);
          fabricCanvas.dispose();
        };
      }, 100);
    }
  }, [canvas]);

  // Handle tool changes
  useEffect(() => {
    if (!canvas) return;
    
    // Clear all event listeners
    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');
    
    // Reset drawing mode
    canvas.isDrawingMode = false;
    
    switch (activeTool) {
      case 'select':
        canvas.selection = true;
        canvas.forEachObject(obj => {
          obj.selectable = true;
        });
        break;
        
      case 'draw':
        canvas.isDrawingMode = true;
        if (!canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        }
        canvas.freeDrawingBrush.width = 2;
        canvas.freeDrawingBrush.color = '#000000';
        break;
        
      case 'rectangle':
        let rect: fabric.Rect;
        canvas.selection = true;
        canvas.forEachObject(obj => {
          obj.selectable = true;
        });
        
        canvas.on('mouse:down', (o) => {
          const pointer = canvas.getPointer(o.e);
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
            hasBorders: true
          });
          
          canvas.add(rect);
          canvas.setActiveObject(rect);
          canvas.renderAll();
        });
        
        canvas.on('mouse:move', (o) => {
          if (!isDrawing.current) return;
          
          const pointer = canvas.getPointer(o.e);
          
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
          
          canvas.renderAll();
        });
        
        canvas.on('mouse:up', () => {
          isDrawing.current = false;
        });
        break;
        
      case 'circle':
        let circle: fabric.Circle;
        canvas.selection = true; // Enable selection
        
        canvas.on('mouse:down', (o) => {
          if (activeTool !== 'circle') return; // Only create shape if circle tool is active
          const pointer = canvas.getPointer(o.e);
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
            hasBorders: true
          });
          
          canvas.add(circle);
          canvas.setActiveObject(circle);
          canvas.renderAll();
        });
        
        canvas.on('mouse:move', (o) => {
          if (!isDrawing.current) return;
          
          const pointer = canvas.getPointer(o.e);
          const radius = Math.sqrt(
            Math.pow(pointer.x - startPoint.current.x, 2) + 
            Math.pow(pointer.y - startPoint.current.y, 2)
          ) / 2;
          
          circle.set({
            radius: radius,
            left: startPoint.current.x - radius,
            top: startPoint.current.y - radius
          });
          
          canvas.renderAll();
        });
        
        canvas.on('mouse:up', () => {
          isDrawing.current = false;
        });
        break;
        
      case 'text':
        canvas.on('mouse:down', (o) => {
          const pointer = canvas.getPointer(o.e);
          const text = new fabric.IText('Text', {
            left: pointer.x,
            top: pointer.y,
            fontFamily: 'Arial',
            fontSize: 20,
            fill: '#000000'
          });
          
          canvas.add(text);
          canvas.setActiveObject(text);
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
              
              // Fix image loading with correct callback pattern
              fabric.Image.fromURL(data, (img: fabric.Image) => {
                img.scale(0.5);
                canvas.add(img);
                canvas.centerObject(img);
                canvas.setActiveObject(img);
                canvas.renderAll();
              }, {
                crossOrigin: 'anonymous'
              });
            };
            reader.readAsDataURL(file);
          }
        };
        break;
        
      case 'eraser':
        canvas.isDrawingMode = false;
        canvas.selection = false;
        const eraserRadius = 10; // Size of eraser hit area

        canvas.on('mouse:down', () => {
          isDrawing.current = true;
        });

        canvas.on('mouse:move', (options) => {
          if (!isDrawing.current) return;
          
          const pointer = canvas.getPointer(options.e);
          const objects = canvas.getObjects();
          
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
              canvas.remove(obj);
            }
          }
          canvas.renderAll();
        });

        canvas.on('mouse:up', () => {
          isDrawing.current = false;
        });
        break;
        
      case 'connector':
        let line: fabric.Line;
        canvas.selection = true; // Enable selection
        
        canvas.on('mouse:down', (o) => {
          if (activeTool !== 'connector') return; // Only create line if connector tool is active
          const pointer = canvas.getPointer(o.e);
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
              hasBorders: true
            }
          );
          
          canvas.add(line);
          canvas.setActiveObject(line);
          canvas.renderAll();
        });
        
        canvas.on('mouse:move', (o) => {
          if (!isDrawing.current) return;
          
          const pointer = canvas.getPointer(o.e);
          line.set({ x2: pointer.x, y2: pointer.y });
          canvas.renderAll();
        });
        
        canvas.on('mouse:up', () => {
          isDrawing.current = false;
        });
        break;
    }
    
  }, [canvas, activeTool]);
  
  return (
    <div className="w-full h-full overflow-hidden relative">
      <canvas ref={canvasRef} id="drawing-canvas" />
    </div>
  );
}