'use client';

import { Tool } from '@/types/whiteboard';
import { 
  MousePointer, 
  Pencil, 
  Square, 
  Circle, 
  Type, 
  Image, 
  Eraser,
  Share2,
  GitBranch
} from 'lucide-react';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
}

export default function Toolbar({ 
  activeTool, 
  setActiveTool 
}: ToolbarProps) {
  const tools = [
    { id: 'select', icon: <MousePointer size={20} />, label: 'Select' },
    { id: 'draw', icon: <Pencil size={20} />, label: 'Pen' },
    { id: 'rectangle', icon: <Square size={20} />, label: 'Rectangle' },
    { id: 'circle', icon: <Circle size={20} />, label: 'Circle' },
    { id: 'text', icon: <Type size={20} />, label: 'Text' },
    { id: 'image', icon: <Image size={20} />, label: 'Image' },
    { id: 'eraser', icon: <Eraser size={20} />, label: 'Eraser' },
    { id: 'connector', icon: <Share2 size={20} />, label: 'Connector' },
    { id: 'flowchart', icon: <GitBranch size={20} />, label: 'Flowchart Node' },
  ];

  return (
    <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4">
      {/* Tools */}
      <div className="flex flex-col gap-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={`p-2 rounded ${activeTool === tool.id ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
            onClick={() => setActiveTool(tool.id as Tool)}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
      </div>
    </div>
  );
}