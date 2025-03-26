import { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';

interface TextInputNodeProps {
  data: {
    label: string;
    placeholder?: string;
    value?: string;
  };
  isConnectable: boolean;
}

function TextInputNode({ data, isConnectable }: TextInputNodeProps) {
  const [value, setValue] = useState(data.value || '');

  return (
    <div className="relative p-0.5">
      <div className="px-2 py-1 shadow-md rounded-md bg-purple-50 border-2 border-purple-500">
        <div className="flex items-center">
          <div className="rounded-full w-6 h-6 flex justify-center items-center bg-purple-100 mr-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-700">{data.label}</div>
          </div>
        </div>
        
        {/* Input field area */}
        <div className="mt-1">
          <input
            type="text"
            className="w-full p-1 text-xs rounded-md border border-purple-200 focus:outline-none focus:ring-1 focus:ring-purple-300 focus:border-transparent"
            placeholder={data.placeholder || "Enter text..."}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
      </div>

      {/* Only output handle since this is an input node */}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-1.5 h-1.5 bg-purple-500"
      />
    </div>
  );
}

export default memo(TextInputNode);
