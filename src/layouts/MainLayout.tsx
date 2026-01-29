import React from 'react';
import { LayoutDashboard, Package, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { useSettings } from '../components/SettingsContext';

interface MainLayoutProps {
    children: React.ReactNode;
    activePage: string;
    onNavigate: (page: string) => void;
}

const SidebarItem = ({
    icon: Icon,
    label,
    isActive,
    onClick
}: {
    icon: React.ElementType,
    label: string,
    isActive: boolean,
    onClick: () => void
}) => (
    <Button
        variant={isActive ? "glass" : "ghost"}
        className={cn(
            "w-full justify-start gap-3 transition-all duration-300",
            isActive ? "bg-primary/20 hover:bg-primary/30 text-white border-primary/20 shadow-[0_0_20px_rgba(124,58,237,0.2)]" : "text-gray-400 hover:text-white"
        )}
        onClick={onClick}
    >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
    </Button>
);

const MainLayout: React.FC<MainLayoutProps> = ({ children, activePage, onNavigate }) => {
    const { settings } = useSettings();

    return (
        <div
            className="flex h-screen w-full bg-background text-foreground overflow-hidden relative transition-all duration-500"
            style={settings.backgroundImage ? {
                backgroundImage: `url(${settings.backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            } : {}}
        >
            {/* Background Overlay for readability if image is set */}
            {settings.backgroundImage && (
                <div
                    className="absolute inset-0 bg-black backdrop-blur-sm z-0"
                    style={{ opacity: settings.backgroundOpacity !== undefined ? settings.backgroundOpacity : 0.7 }}
                />
            )}

            {/* Glass Sidebar */}
            <aside className="w-64 h-full flex flex-col p-4 gap-6 bg-black/40 backdrop-blur-xl border-r border-white/10 relative z-50">

                {/* Logo Area */}
                <div className="flex items-center gap-3 px-2 py-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20 flex items-center justify-center text-white font-bold">
                        K
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-lg leading-none tracking-tight">Kamisama</span>
                        <span className="text-xs text-muted-foreground">Loader</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Menu</div>

                    <SidebarItem
                        icon={LayoutDashboard}
                        label="Dashboard"
                        isActive={activePage === 'dashboard'}
                        onClick={() => onNavigate('dashboard')}
                    />
                    <SidebarItem
                        icon={Package}
                        label="My Mods"
                        isActive={activePage === 'mods'}
                        onClick={() => onNavigate('mods')}
                    />
                    {/* Note: 'browse' is currently a tab in Mods, but we can potentially link it conceptually. 
               For now we keep the main high level navs. */}
                    <SidebarItem
                        icon={SettingsIcon}
                        label="Settings"
                        isActive={activePage === 'settings'}
                        onClick={() => onNavigate('settings')}
                    />
                </nav>

                {/* Footer / Status */}
                <div className="mt-auto p-4 rounded-xl bg-white/5 border border-white/5 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse" />
                        <span className="text-xs font-medium text-gray-300">System Online</span>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Top Header effects could go here */}
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />

                <div className="flex-1 overflow-auto relative z-10 p-6">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
