'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Tool } from '@/types/whiteboard';
import Toolbar from '@/components/Toolbar';

// Import component with no SSR to avoid hydration issues with canvas
const IntegratedCanvas = dynamic(() => import('@/components/IntegratedCanvas'), { ssr: false });

export default function WhiteboardPage() {
  const [activeTool, setActiveTool] = useState<Tool>('select');
  
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-xl font-semibold text-pink-600">Whiteboard</h1>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        <Toolbar 
          activeTool={activeTool} 
          setActiveTool={setActiveTool} 
        />
        
        <main className="flex-1 overflow-hidden">
          <IntegratedCanvas activeTool={activeTool} />
        </main>
      </div>
    </div>
  );
}