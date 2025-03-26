import { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';

interface FlowNodeProps {
  data: {
    label: string;
  };
  isConnectable: boolean;
}

function FlowNode({ data, isConnectable }: FlowNodeProps) {
  const [label, setLabel] = useState(data.label);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="relative p-0.5">
      <div className="px-2 py-1 shadow-md rounded-md bg-blue-50 border-2 border-blue-500">
        <div className="flex items-center">
          <div className="rounded-full w-6 h-6 flex justify-center items-center bg-blue-100 mr-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div 
            className="min-w-[70px] text-center"
            onClick={() => !isEditing && setIsEditing(true)}
          >
            {isEditing ? (
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={() => setIsEditing(false)}
                className="w-full text-xs font-medium text-gray-700 border border-blue-200 p-0.5 rounded"
                autoFocus
                onFocus={(e) => e.target.select()}
              />
            ) : (
              <div className="text-xs font-medium text-gray-700">
                {label}
                <span className="text-[9px] text-gray-400 ml-1 opacity-50 block">(Edit)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Handles on all four sides for maximum connection flexibility */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-1.5 h-1.5 bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-1.5 h-1.5 bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-1.5 h-1.5 bg-blue-500"
      />
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-1.5 h-1.5 bg-blue-500"
      />
    </div>
  );
}

export default memo(FlowNode);