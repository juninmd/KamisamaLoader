import React from 'react';
import { Settings, List, Home } from 'lucide-react';
import TitleBar from './TitleBar';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate }) => {
  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'mods', icon: List, label: 'Mods' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex flex-col h-screen w-full bg-gradient-to-br from-gray-900 to-black text-white overflow-hidden rounded-lg border border-glass-border">
      <TitleBar />
      <div className="flex flex-1 pt-8 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-sidebar-bg backdrop-blur-md border-r border-glass-border flex flex-col p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                activePage === item.id
                  ? 'bg-blue-600/30 text-blue-200 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                  : 'hover:bg-white/5 text-gray-400 hover:text-gray-100'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto bg-black/20 p-6 relative">
             <div className="absolute inset-0 bg-[url('https://c4.wallpaperflare.com/wallpaper/586/603/742/dragon-ball-z-son-goku-dragon-ball-super-ultra-instinct-wallpaper-preview.jpg')] bg-cover bg-center opacity-10 pointer-events-none mix-blend-overlay"></div>
             <div className="relative z-10">
                {children}
             </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
