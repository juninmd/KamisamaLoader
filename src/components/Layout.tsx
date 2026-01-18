import React from 'react';
import { Settings, List, LayoutDashboard, Zap } from 'lucide-react';
import TitleBar from './TitleBar';
import { useSettings } from './SettingsContext';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate }) => {
  const { settings } = useSettings();
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'mods', icon: List, label: 'Mods' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex flex-col h-screen w-full bg-dark-bg text-white overflow-hidden border border-glass-border select-none font-sans">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden relative">

        {/* Background Layer */}
        <div className="absolute inset-0 z-0">
            {/* Dark gradient base */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-slate-900 to-black"></div>

            {/* Subtle Texture/Image */}
            <div
                className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-overlay pointer-events-none transition-all duration-500"
                style={{ backgroundImage: `url('${settings.backgroundImage || 'https://images7.alphacoders.com/936/936566.jpg'}')` }}
            ></div>

            {/* Blur overlay to ensure readability */}
            <div className="absolute inset-0 backdrop-blur-sm bg-black/40"></div>
        </div>

        {/* Sidebar */}
        <div className="relative z-20 w-20 lg:w-64 flex-shrink-0 bg-black/20 backdrop-blur-xl border-r border-white/5 flex flex-col py-6 space-y-6 transition-all duration-300">

          {/* Logo / Brand */}
          <div className="px-4 flex items-center justify-center lg:justify-start space-x-3 mb-4">
             <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Zap className="text-white fill-current" size={20} />
             </div>
             <div className="hidden lg:block">
                 <h1 className="font-bold text-lg tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">KAMISAMA</h1>
                 <p className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold">Mod Loader</p>
             </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 space-y-2">
            {navItems.map((item) => {
                const isActive = activePage === item.id;
                return (
                    <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`
                        w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 group
                        ${isActive
                            ? 'bg-blue-600/20 text-blue-300 border border-blue-500/20 shadow-[0_0_20px_rgba(37,99,235,0.15)]'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'}
                    `}
                    >
                        <div className={`p-1 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'group-hover:text-blue-400'}`}>
                            <item.icon size={20} />
                        </div>
                        <span className={`hidden lg:block font-medium ${isActive ? 'text-white' : ''}`}>{item.label}</span>

                        {/* Active Indicator Strip */}
                        {isActive && (
                            <div className="absolute left-0 w-1 h-8 bg-blue-500 rounded-r-full shadow-[0_0_10px_#3b82f6]"></div>
                        )}
                    </button>
                );
            })}
          </nav>

          {/* Bottom Info */}
          <div className="px-4 hidden lg:block">
             <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs text-gray-400">UE4SS Active</span>
                </div>
                <p className="text-[10px] text-gray-600">v1.0.0-beta</p>
             </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="relative z-10 flex-1 overflow-hidden flex flex-col">
             <div className="flex-1 overflow-auto p-4 lg:p-8 scroll-smooth">
                {children}
             </div>
        </div>

      </div>
    </div>
  );
};

export default Layout;
