import React from 'react';
import { Minus, Square, X } from 'lucide-react';

declare global {
  interface Window {
    electronAPI: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      getInstalledMods: () => Promise<any[]>;
      installMod: (filePath: string) => Promise<{ success: boolean; message: string }>;
      toggleMod: (modId: string, isEnabled: boolean) => Promise<boolean>;
      saveSettings: (settings: any) => Promise<boolean>;
    };
  }
}

const TitleBar: React.FC = () => {
  return (
    <div className="h-8 bg-black/40 w-full flex justify-between items-center draggable select-none z-50 fixed top-0 left-0 border-b border-glass-border">
      <div className="pl-4 text-xs font-semibold tracking-wider text-gray-300">
        KAMISAMA LOADER
      </div>
      <div className="flex h-full no-drag">
        <button
          onClick={() => window.electronAPI.minimize()}
          className="px-4 hover:bg-white/10 flex items-center justify-center transition-colors text-gray-400 hover:text-white"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => window.electronAPI.maximize()}
          className="px-4 hover:bg-white/10 flex items-center justify-center transition-colors text-gray-400 hover:text-white"
        >
          <Square size={12} />
        </button>
        <button
          onClick={() => window.electronAPI.close()}
          className="px-4 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors text-gray-400"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
