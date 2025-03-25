import { Canvas } from 'fabric';

declare module 'fabric' {
  interface Canvas {
    historyUndo: string[];
    historyRedo: string[];
    undo(): void;
    redo(): void;
  }
}
