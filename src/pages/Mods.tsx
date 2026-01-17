import React from 'react';

const Mods: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
          Installed Mods
        </h1>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/20">
          Add Mod
        </button>
      </div>

      <div className="grid gap-4">
        {/* Placeholder Mod Items */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="glass-panel p-4 flex items-center space-x-4 hover:bg-white/5 transition-colors cursor-pointer group">
            <div className="w-16 h-16 bg-gray-700/50 rounded-lg flex items-center justify-center text-gray-500 group-hover:bg-gray-600/50 transition-colors">
              IMG
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-gray-200 group-hover:text-white">Sample Mod {i}</h3>
              <p className="text-sm text-gray-400">Author Name • v1.0.0</p>
            </div>
            <div className="flex items-center space-x-2">
               <span className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-300 border border-green-500/30">Enabled</span>
            </div>
          </div>
        ))}
        <div className="py-4 text-center text-gray-500 text-sm italic">
          Load more...
        </div>
      </div>
    </div>
  );
};

export default Mods;
