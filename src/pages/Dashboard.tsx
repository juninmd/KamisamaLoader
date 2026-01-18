import React, { useState } from 'react';
import { Play, Sparkles, Activity, Globe } from 'lucide-react';

interface DashboardProps {
    onNavigate: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
    const [launching, setLaunching] = useState(false);

    const handleLaunch = () => {
        setLaunching(true);
        // Simulate launch delay
        setTimeout(() => setLaunching(false), 3000);
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-white/10 p-8 flex items-center justify-between shadow-2xl">
                 <div className="relative z-10 max-w-lg">
                    <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-md">
                        Sparking! ZERO
                    </h1>
                    <p className="text-blue-200 text-lg mb-6">
                        Ready to transcend your limits?
                    </p>

                    <button
                        onClick={handleLaunch}
                        disabled={launching}
                        className={`
                            relative group flex items-center justify-center space-x-3
                            bg-gradient-to-r from-yellow-500 to-orange-600
                            text-white font-bold text-xl px-10 py-4 rounded-full
                            transition-all duration-300 transform
                            ${launching ? 'scale-110' : 'hover:scale-105'}
                            ki-charge
                            shadow-lg shadow-orange-500/50
                            hover:shadow-orange-400/80 hover:shadow-xl
                        `}
                    >
                        {launching ? (
                            <Activity className="animate-spin" />
                        ) : (
                            <Play fill="currentColor" />
                        )}
                        <span className={launching ? "animate-pulse" : ""}>{launching ? 'CHARGING...' : 'LAUNCH GAME'}</span>

                        {/* Internal glow for extra DBZ feel */}
                        <div className="absolute inset-0 rounded-full bg-white/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
                    </button>
                 </div>

                 {/* Decorative Icon/Image */}
                 <div className="hidden lg:block relative z-10 opacity-80 transform rotate-12">
                    <Sparkles size={120} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                 </div>
            </div>

            {/* Quick Actions / Featured */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="glass-panel p-5 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => onNavigate('mods')}>
                    <div className="flex items-center space-x-3 mb-3 text-blue-400">
                        <Activity size={24} />
                        <h3 className="font-bold text-lg">Mod Status</h3>
                    </div>
                    <p className="text-gray-300 text-sm">
                        12 Mods Installed<br/>
                        <span className="text-green-400">All Systems Normal</span>
                    </p>
                </div>

                <div className="glass-panel p-5 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => onNavigate('mods')}>
                    <div className="flex items-center space-x-3 mb-3 text-purple-400">
                        <Globe size={24} />
                        <h3 className="font-bold text-lg">Browse GameBanana</h3>
                    </div>
                    <p className="text-gray-300 text-sm">
                        Discover the latest texture packs, characters, and sounds.
                    </p>
                </div>

                <div className="glass-panel p-5 relative overflow-hidden group">
                     <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                     <h3 className="font-bold text-lg text-red-400 mb-2">Daily Saiyan Quote</h3>
                     <p className="text-gray-300 italic text-sm relative z-10">
                        "Power comes in response to a need, not a desire. You have to create that need."
                     </p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
