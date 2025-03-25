'use client';

import { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';

interface FlowNodeProps {
  data: {
    label: string;
  };
  selected: boolean;
}

export default function FlowNode({ data, selected }: FlowNodeProps) {
  const [label, setLabel] = useState(data.label);
  const [isEditing, setIsEditing] = useState(false);

  // Update the local state when props change
  useEffect(() => {
    setLabel(data.label);
  }, [data.label]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    // Here you would update the node data in the parent component
    // via callbacks or context if needed
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`p-2 rounded border-2 ${
        selected ? 'border-blue-500' : 'border-gray-300'
      } bg-white shadow-md w-36 h-auto text-center`}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Top} />
      
      {isEditing ? (
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full text-center bg-blue-50 outline-none"
          autoFocus
        />
      ) : (
        <div>{label}</div>
      )}
      
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}