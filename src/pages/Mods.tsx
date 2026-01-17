import React, { useState } from 'react';
import { Search, Download, Folder } from 'lucide-react';

const Mods: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'installed' | 'browse'>('installed');

  return (
    <div className="h-full flex flex-col">
      {/* Top Bar with Tabs and Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">

        {/* Tabs */}
        <div className="flex bg-black/40 p-1 rounded-xl backdrop-blur-sm border border-white/10">
            <button
                onClick={() => setActiveTab('installed')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'installed'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
                Installed
            </button>
            <button
                onClick={() => setActiveTab('browse')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'browse'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
                Browse Online
            </button>
        </div>

        {/* Search Bar */}
        <div className="relative group w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-400 transition-colors" size={18} />
            <input
                type="text"
                placeholder="Search mods..."
                className="w-full bg-black/30 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'installed' ? (
             <InstalledModsView />
        ) : (
             <BrowseModsView />
        )}
      </div>
    </div>
  );
};

const InstalledModsView = () => (
    <div className="h-full overflow-y-auto pr-2 space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="glass-panel p-4 flex items-center space-x-4 hover:bg-white/5 transition-all cursor-pointer group border border-white/5 hover:border-blue-500/30">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center text-gray-500 group-hover:from-blue-900 group-hover:to-blue-800 transition-all shadow-inner">
              <Folder size={24} className="group-hover:text-blue-200" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-200 group-hover:text-blue-300 transition-colors">Character Skin Pack {i}</h3>
              <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-400 bg-black/30 px-2 py-0.5 rounded">v1.2</span>
                  <span className="text-xs text-gray-500">by ModderName</span>
              </div>
            </div>
            <div className="flex items-center space-x-3 opacity-60 group-hover:opacity-100 transition-opacity">
               <label className="flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="hidden peer" />
                  <div className="w-10 h-5 bg-gray-700 rounded-full peer-checked:bg-green-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all relative"></div>
               </label>
            </div>
          </div>
        ))}
    </div>
);

const BrowseModsView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto h-full pr-2 pb-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
             <div key={i} className="glass-panel overflow-hidden group flex flex-col">
                <div className="h-32 bg-gray-800 relative">
                     {/* Simulated Image */}
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                     <span className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">NEW</span>
                     <div className="absolute bottom-2 left-3">
                         <h4 className="font-bold text-white text-lg leading-tight">Goku UI Omen</h4>
                     </div>
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between">
                     <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                        Adds Ultra Instinct Omen Goku with custom moveset and voice lines.
                     </p>
                     <button className="w-full flex items-center justify-center space-x-2 bg-white/10 hover:bg-blue-600 text-white py-2 rounded-lg transition-colors text-sm font-medium">
                        <Download size={16} />
                        <span>Install</span>
                     </button>
                </div>
             </div>
        ))}
    </div>
);

export default Mods;
