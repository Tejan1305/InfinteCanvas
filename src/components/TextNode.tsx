import { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';

interface TextNodeProps {
  data: {
    label: string;
    content?: string;
  };
  isConnectable: boolean;
}

function TextNode({ data, isConnectable }: TextNodeProps) {
  const [content, setContent] = useState(data.content || "Sample text content. Edit me!");
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="relative p-0.5">
      <div className="px-2 py-1 shadow-md rounded-md bg-yellow-50 border-2 border-yellow-500">
        <div className="flex items-center">
          <div className="rounded-full w-6 h-6 flex justify-center items-center bg-yellow-100 mr-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-700">{data.label}</div>
          </div>
        </div>
        
        {/* Text content area - now editable */}
        <div 
          className="mt-1 p-1 rounded-md border border-yellow-200 min-h-[30px] max-h-[80px] overflow-y-auto bg-white"
          onClick={() => !isEditing && setIsEditing(true)}
        >
          {isEditing ? (
            <textarea
              className="w-full h-full min-h-[30px] text-[9px] text-gray-700 focus:outline-none resize-none border-0 p-0 bg-transparent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={() => setIsEditing(false)}
              autoFocus
              onFocus={(e) => e.target.select()}
            />
          ) : (
            <p className="text-[9px] text-gray-700">
              {content}
              <span className="text-[8px] text-gray-400 ml-1 opacity-50">(Edit)</span>
            </p>
          )}
        </div>
      </div>

      {/* Handles for connections */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-1.5 h-1.5 bg-yellow-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-1.5 h-1.5 bg-yellow-500"
      />
    </div>
  );
}

export default memo(TextNode);
