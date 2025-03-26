import { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';

interface TextOutputNodeProps {
  data: {
    label: string;
    output?: string;
  };
  isConnectable: boolean;
}

function TextOutputNode({ data, isConnectable }: TextOutputNodeProps) {
  const [output, setOutput] = useState(data.output || "Output will appear here");
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="relative p-0.5">
      <div className="px-2 py-1 shadow-md rounded-md bg-red-50 border-2 border-red-500">
        <div className="flex items-center">
          <div className="rounded-full w-6 h-6 flex justify-center items-center bg-red-100 mr-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-700">{data.label}</div>
          </div>
        </div>
        
        {/* Output display area - now editable */}
        <div 
          className="mt-1 p-1 rounded-md border border-red-200 bg-gray-50 min-h-[30px] max-h-[80px] overflow-y-auto"
          onClick={() => !isEditing && setIsEditing(true)}
        >
          {isEditing ? (
            <textarea
              className="w-full h-full min-h-[30px] text-[9px] font-mono bg-gray-50 text-gray-700 focus:outline-none resize-none border-0 p-0"
              value={output}
              onChange={(e) => setOutput(e.target.value)}
              onBlur={() => setIsEditing(false)}
              autoFocus
              onFocus={(e) => e.target.select()}
            />
          ) : (
            <pre className="text-[9px] text-gray-700 font-mono whitespace-pre-wrap">
              {output}
              <span className="text-[8px] text-gray-400 ml-1 opacity-50 font-sans">(Edit)</span>
            </pre>
          )}
        </div>
      </div>

      {/* Only input handle since this is an output node */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-1.5 h-1.5 bg-red-500"
      />
    </div>
  );
}

export default memo(TextOutputNode);
