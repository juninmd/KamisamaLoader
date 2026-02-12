import React, { useState, useEffect } from 'react';
import { Play, Activity, Globe, Download, Zap, RefreshCw, Star } from 'lucide-react';

interface DashboardProps {
    onNavigate: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
    const [launching, setLaunching] = useState(false);
    const [stats, setStats] = useState({ total: 0, active: 0, updates: 0 });
    const [featuredMods, setFeaturedMods] = useState<any[]>([]);
    const [loadingFeatured, setLoadingFeatured] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            // Load Stats
            const mods = await window.electronAPI.getInstalledMods() || [];
            const activeCount = mods.filter((m: any) => m.isEnabled).length;
            const updates = await window.electronAPI.checkForUpdates() || [];

            setStats({
                total: mods.length,
                active: activeCount,
                updates: updates.length
            });

            // Load Featured Mods
            setLoadingFeatured(true);
            const featured = await window.electronAPI.fetchFeaturedMods();
            setFeaturedMods(featured.slice(0, 4)); // Show top 4
        } catch (error) {
            console.error("Dashboard data load error:", error);
        } finally {
            setLoadingFeatured(false);
        }
    };

    const handleLaunch = async () => {
        setLaunching(true);
        try {
            await window.electronAPI.launchGame();
        } catch (error) {
            console.error(error);
        } finally {
            setTimeout(() => setLaunching(false), 5000);
        }
    };

    return (
        <div className="flex flex-col h-full space-y-8 animate-in fade-in duration-700">

            {/* Hero Section - Dynamic & Premium */}
            <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 flex flex-col md:flex-row items-center justify-between shadow-[0_0_50px_rgba(59,130,246,0.15)] bg-[#050510] group min-h-[300px]">

                {/* Background Image - High Quality Wallpaper */}
                <div className="absolute inset-0 bg-[url('https://images.alphacoders.com/134/1346413.png')] bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-1000 ease-in-out mix-blend-lighten"></div>

                {/* Gradient Overlays for Readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-0"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-0"></div>

                {/* Content Container */}
                <div className="relative z-20 p-10 max-w-2xl space-y-6 flex flex-col justify-center h-full">
                    <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-yellow-400 font-bold tracking-wider text-xs uppercase opacity-80">
                            <Zap size={14} className="animate-pulse" />
                            <span>Kamisama Loader V1.0</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black italic text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] tracking-tighter leading-none">
                            SPARKING! <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 animate-gradient-x">ZERO</span>
                        </h1>
                    </div>

                    <p className="text-gray-300 text-lg font-medium leading-relaxed max-w-lg drop-shadow-md">
                        Manage your mods with the power of a God. <br />Experience Dragon Ball in its ultimate form.
                    </p>

                    <div className="flex items-center space-x-4 pt-2">
                        <button
                            onClick={handleLaunch}
                            disabled={launching}
                            className={`
                                relative group flex items-center justify-center space-x-3
                                bg-gradient-to-r from-blue-600 to-indigo-700
                                text-white font-black text-xl px-10 py-4 rounded-xl
                                transition-all duration-300 transform
                                ${launching ? 'scale-105 opacity-90' : 'hover:scale-105 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]'}
                                border border-blue-400/30 overflow-hidden shadow-xl
                            `}
                        >
                            <div className="absolute inset-0 -translate-x-full group-hover:animate-shine bg-gradient-to-r from-transparent via-white/20 to-transparent z-10"></div>

                            {launching ? (
                                <Activity className="animate-spin text-white" />
                            ) : (
                                <Play fill="currentColor" className="text-white drop-shadow-md" />
                            )}
                            <span className="tracking-widest relative z-20">{launching ? 'INITIALIZING...' : 'LAUNCH GAME'}</span>
                        </button>
                    </div>
                </div>

                {/* Character Art - Right Side */}
                <div className="hidden lg:block relative z-10 w-[40%] h-full flex items-end justify-end pointer-events-none self-end">
                    {/* Using a mask to blend the bottom of the character if needed, or just placing it nicely */}
                    <img
                        src="https://media.fortniteapi.io/images/cosmetics/c5598877bc33b41249aa3429fa83984d/v2/transparent.png"
                        className="w-full h-auto object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.1)] opacity-90"
                        style={{ maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)' }}
                        alt=""
                        onError={(e) => e.currentTarget.style.display = 'none'}
                    />
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">

                {/* Left Col: Stats & Quick Actions */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Status Card */}
                    <div className="glass-panel p-6 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-xl text-white flex items-center gap-2">
                                <Activity size={20} className="text-blue-400" />
                                System Status
                            </h3>
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse box-shadow-[0_0_10px_#22c55e]"></div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-400">Total Mods</span>
                                    <span className="text-white font-mono">{stats.total}</span>
                                </div>
                                <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min((stats.total / 100) * 100, 100)}%` }}></div>
                                </div>
                            </div>

                            <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-400">Enabled</span>
                                    <span className="text-green-400 font-mono">{stats.active}</span>
                                </div>
                                <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${stats.total ? (stats.active / stats.total) * 100 : 0}%` }}></div>
                                </div>
                            </div>

                            {stats.updates > 0 && (
                                <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30 flex items-center justify-between animate-pulse cursor-pointer hover:bg-yellow-500/20 transition-colors" onClick={() => onNavigate('mods')}>
                                    <div className="flex items-center gap-3">
                                        <RefreshCw size={18} className="text-yellow-500 animate-spin-slow" />
                                        <span className="text-yellow-200 text-sm font-medium">{stats.updates} Updates Available</span>
                                    </div>
                                    <Download size={16} className="text-yellow-500" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="glass-panel p-6 hover:bg-white/5 transition-all cursor-pointer group" onClick={() => onNavigate('mods')}>
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-purple-500/20 rounded-full group-hover:scale-110 transition-transform">
                                <Globe size={24} className="text-purple-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg group-hover:text-purple-300 transition-colors">Browse Mods</h3>
                                <p className="text-gray-400 text-sm">Explore GameBanana Catalog</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Col: Featured Feed */}
                <div className="lg:col-span-2 flex flex-col space-y-4">
                    <div className="flex items-center justify-between pl-2">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Star size={20} className="text-yellow-400 fill-yellow-400" />
                            Featured Mods
                        </h2>
                        <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors" onClick={() => onNavigate('mods')}>View All</button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {loadingFeatured ? (
                            // Skeleton Loader
                            Array(3).fill(0).map((_, i) => (
                                <div key={i} className="glass-panel p-4 h-24 animate-pulse flex items-center gap-4">
                                    <div className="h-16 w-16 bg-gray-700 rounded-lg"></div>
                                    <div className="space-y-2 flex-1">
                                        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                                        <div className="h-3 bg-gray-700/50 rounded w-1/2"></div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            featuredMods.map((mod) => (
                                <div key={mod.id} className="glass-panel p-3 flex gap-4 hover:bg-white/10 transition-colors cursor-pointer group border-l-4 border-transparent hover:border-l-blue-500">
                                    <div className="h-20 w-20 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0 relative">
                                        <img src={mod.iconUrl} alt={mod.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    </div>
                                    <div className="flex flex-col justify-center min-w-0">
                                        <h4 className="font-bold text-white text-base truncate pr-4 group-hover:text-blue-300 transition-colors">{mod.name}</h4>
                                        <p className="text-gray-400 text-sm truncate">{mod.category} • by {mod.author}</p>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                            <span className="flex items-center gap-1"><Download size={12} /> {mod.downloadCount}</span>
                                            <span className="flex items-center gap-1"><Activity size={12} /> {mod.viewCount} views</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
