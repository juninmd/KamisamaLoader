import React, { useState, useEffect } from 'react';
import { Play, Activity, Globe, Download, RefreshCw, Star } from 'lucide-react';
import { Badge, Button, Card, ProgressBar, StatTile } from '@juninmd/sonido';
import Skeleton from '../components/Skeleton';
import { Artwork } from '../components/Artwork';
import heroArtwork from '../assets/kamisama-hero.png';

interface DashboardProps {
    onNavigate: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
    const [launching, setLaunching] = useState(false);
    const [stats, setStats] = useState({ total: 0, active: 0, updates: 0 });
    const [featuredMods, setFeaturedMods] = useState<any[]>([]);
    const [loadingFeatured, setLoadingFeatured] = useState(true);

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

    useEffect(() => {
        loadDashboardData();
    }, []);

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

    const enabledRatio = stats.total ? stats.active / stats.total : 0;

    return (
        <div className="flex flex-col h-full space-y-8 animate-in fade-in duration-700">

            {/* Hero Section */}
            <div data-testid="dashboard-hero" className="relative isolate w-full shrink-0 overflow-hidden rounded-3xl border border-white/10 flex items-center shadow-[0_0_50px_rgba(139,92,246,0.15)] bg-[#050510] group min-h-[380px]">
                <img
                    data-testid="hero-artwork"
                    src={heroArtwork}
                    alt="Original cosmic warrior artwork"
                    className="absolute inset-y-0 right-0 h-full w-auto max-w-none object-contain object-right opacity-90 transition-transform duration-1000 ease-out group-hover:scale-[1.02]"
                />

                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 via-45% to-transparent z-0"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-0"></div>

                <div className="relative z-20 p-10 max-w-2xl space-y-6 flex flex-col justify-center h-full">
                    <div className="space-y-1">
                        <Badge tone="gold" appearance="soft" dot>
                            Kamisama Loader V1.0
                        </Badge>
                        <h1 className="text-5xl md:text-6xl font-black italic text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] tracking-tighter leading-none">
                            SPARKING! <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500">ZERO</span>
                        </h1>
                    </div>

                    <p className="text-gray-300 text-lg font-medium leading-relaxed max-w-lg drop-shadow-md">
                        Manage your mods with the power of a God. <br />Experience Dragon Ball in its ultimate form.
                    </p>

                    <div className="flex items-center gap-4 pt-2">
                        <Button
                            size="lg"
                            press
                            loading={launching}
                            iconStart={launching ? undefined : <Play size={20} fill="currentColor" />}
                            onClick={handleLaunch}
                            className="text-xl font-black tracking-widest px-10 py-4 h-auto"
                        >
                            {launching ? 'INITIALIZING...' : 'LAUNCH GAME'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0 flex-1">

                {/* Left Col: Stats & Quick Actions */}
                <div className="lg:col-span-1 space-y-6">
                    <Card surface="glass" className="p-6 overflow-hidden">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
                            <h3 className="font-bold text-lg text-white flex items-center gap-2 whitespace-nowrap">
                                <Activity size={20} className="text-primary" />
                                System Status
                            </h3>
                            <Badge tone="success" appearance="soft" dot live>Online</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <StatTile label="Total Mods" value={stats.total} tone="accent" />
                            <StatTile label="Enabled" value={stats.active} tone="success" />
                        </div>

                        <div className="mt-4 space-y-4">
                            <ProgressBar value={Math.min(stats.total / 100, 1)} label="Library capacity" showValue tone="accent" />
                            <ProgressBar value={enabledRatio} label="Enabled ratio" showValue tone="aqua" />
                        </div>

                        {stats.updates > 0 && (
                            <button
                                className="mt-4 w-full bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30 flex items-center justify-between hover:bg-yellow-500/20 transition-colors"
                                onClick={() => onNavigate('mods')}
                            >
                                <div className="flex items-center gap-3">
                                    <RefreshCw size={18} className="text-yellow-500" />
                                    <span className="text-yellow-200 text-sm font-medium">{stats.updates} Updates Available</span>
                                </div>
                                <Download size={16} className="text-yellow-500" />
                            </button>
                        )}
                    </Card>

                    <Card surface="glass" interactive className="p-6 cursor-pointer" onClick={() => onNavigate('mods')}>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-500/20 rounded-full">
                                <Globe size={24} className="text-purple-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">Browse Mods</h3>
                                <p className="text-gray-400 text-sm">Explore GameBanana Catalog</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Col: Featured Feed */}
                <div className="lg:col-span-2 flex flex-col space-y-4">
                    <div className="flex items-center justify-between pl-2">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Star size={20} className="text-yellow-400 fill-yellow-400" />
                            Featured Mods
                        </h2>
                        <Button variant="link" onClick={() => onNavigate('mods')}>View All</Button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {loadingFeatured ? (
                            Array(3).fill(0).map((_, i) => (
                                <Skeleton key={i} className="h-24 p-3" />
                            ))
                        ) : (
                            featuredMods.map((mod) => (
                                <Card key={mod.id} surface="glass" padding="sm" interactive className="sn-card--row gap-4 border-l-4 border-l-transparent hover:border-l-primary cursor-pointer">
                                    <Artwork
                                        src={mod.iconUrl}
                                        alt={mod.name}
                                        className="h-20 w-20 rounded-lg flex-shrink-0"
                                        imageClassName="object-cover"
                                    />
                                    <div className="flex flex-col justify-center min-w-0">
                                        <h4 className="font-bold text-white text-base truncate pr-4">{mod.name}</h4>
                                        <p className="text-gray-400 text-sm truncate">{mod.category} · by {mod.author}</p>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Download size={12} />
                                                <Badge appearance="count">{mod.downloadCount}</Badge>
                                            </span>
                                            <span className="flex items-center gap-1"><Activity size={12} /> {mod.viewCount} views</span>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
