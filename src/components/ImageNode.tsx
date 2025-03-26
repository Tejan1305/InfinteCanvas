import { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';

interface ImageNodeProps {
  data: {
    label: string;
    imageUrl?: string;
  };
  isConnectable: boolean;
}

function ImageNode({ data, isConnectable }: ImageNodeProps) {
  const [imageUrl, setImageUrl] = useState(data.imageUrl || '');
  const [imageError, setImageError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const fallbackImageUrl = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiIHJ5PSIyIj48L3JlY3Q+PGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjUiPjwvY2lyY2xlPjxwb2x5bGluZSBwb2ludHM9IjIxIDE1IDEwIDIxIDEwIDIxIj48L3BvbHlsaW5lPjwvc3ZnPg==';

  const handleImageChange = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setImageUrl(event.target?.result as string);
          setImageError(false);
        };
        reader.readAsDataURL(file);
      }
    };
    
    input.click();
  };

  return (
    <div className="relative p-0.5">
      <div className="px-2 py-1 shadow-md rounded-md bg-green-50 border-2 border-green-500">
        <div className="flex items-center">
          <div className="rounded-full w-6 h-6 flex justify-center items-center bg-green-100 mr-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-700">{data.label}</div>
          </div>
        </div>
        
        {/* Image preview area with editing capability */}
        <div 
          className="mt-1 rounded-md overflow-hidden border border-green-200 h-16 flex items-center justify-center bg-white cursor-pointer"
          onClick={handleImageChange}
        >
          {isEditing ? (
            <div className="text-[9px] text-gray-600 p-1">
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onBlur={() => setIsEditing(false)}
                className="w-full border border-green-200 p-0.5 text-[9px]"
                placeholder="Enter image URL or click to upload"
                autoFocus
              />
            </div>
          ) : imageUrl ? (
            <img 
              src={imageError ? fallbackImageUrl : imageUrl} 
              alt={data.label}
              className="max-h-full max-w-full object-contain"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="text-[9px] text-gray-500">Click to add image</div>
          )}
        </div>

        {/* URL editing toggle */}
        <div className="flex justify-between items-center mt-0.5">
          <button 
            className="text-[8px] text-green-700 hover:text-green-800"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(!isEditing);
            }}
          >
            {isEditing ? 'Done' : 'Edit URL'}
          </button>
          {imageUrl && (
            <button 
              className="text-[8px] text-red-600 hover:text-red-700"
              onClick={(e) => {
                e.stopPropagation();
                setImageUrl('');
                setImageError(false);
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Handles for connections */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-1.5 h-1.5 bg-green-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-1.5 h-1.5 bg-green-500"
      />
    </div>
  );
}

export default memo(ImageNode);
