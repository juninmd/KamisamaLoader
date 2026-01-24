import React from 'react';
import { useSettings } from '../components/SettingsContext';
import { useToast } from '../components/ToastContext';

const Settings: React.FC = () => {
    const { settings, updateSettings, selectGameDirectory, selectModDirectory, selectBackgroundImage } = useSettings();
    const { showToast } = useToast();

    const handleInstallUE4SS = async () => {
        showToast('Installing UE4SS...', 'info');
        try {
            const result = await window.electronAPI.installUE4SS();
            if (result.success) {
                showToast(result.message, 'success');
            } else {
                showToast(result.message, 'error');
            }
        } catch (_e) {
            showToast('Failed to install UE4SS', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                Settings
            </h1>

            <div className="glass-panel p-6 space-y-6">
                <div className="space-y-2">
                    <h3 className="text-lg font-medium text-gray-200">Game Directory</h3>
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={settings.gamePath}
                            readOnly
                            placeholder="Path to Dragon Ball: Sparking! ZERO executable"
                            className="flex-1 bg-black/30 border border-glass-border rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500/50"
                        />
                        <button
                            onClick={selectGameDirectory}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
                        >
                            Browse
                        </button>
                    </div>
                    <p className="text-xs text-gray-500">
                        Please select the root directory of the game or the .exe file.
                    </p>
                </div>

                <div className="space-y-2">
                    <h3 className="text-lg font-medium text-gray-200">Mod Download Directory</h3>
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={settings.modDownloadPath || ''}
                            readOnly
                            placeholder="Current directory for mod storage"
                            className="flex-1 bg-black/30 border border-glass-border rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500/50"
                        />
                        <button
                            onClick={selectModDirectory}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
                        >
                            Browse
                        </button>
                    </div>
                    <p className="text-xs text-gray-500">
                        Select a folder where you want to store and manage your mods.
                    </p>
                </div>

                <div className="space-y-2">
                    <h3 className="text-lg font-medium text-gray-200">Background Image</h3>
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={settings.backgroundImage || ''}
                            onChange={(e) => updateSettings({ backgroundImage: e.target.value })}
                            placeholder="URL or Path to background image"
                            className="flex-1 bg-black/30 border border-glass-border rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500/50"
                        />
                        <button
                            onClick={selectBackgroundImage}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
                        >
                            Browse
                        </button>
                    </div>
                    <p className="text-xs text-gray-500">
                        Paste a URL or browse for a local image.
                    </p>
                </div>

                <div className="space-y-2">
                    <h3 className="text-lg font-medium text-gray-200">Launch Arguments</h3>
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={settings.launchArgs || ''}
                            onChange={(e) => updateSettings({ launchArgs: e.target.value })}
                            placeholder="-dx11 -windowed"
                            className="flex-1 bg-black/30 border border-glass-border rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500/50"
                        />
                    </div>
                    <p className="text-xs text-gray-500">
                        Custom arguments passed to the game executable on launch.
                    </p>
                </div>

                <div className="space-y-2 border-t border-white/10 pt-6">
                    <h3 className="text-lg font-medium text-gray-200">Tools & Mod Loaders</h3>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={handleInstallUE4SS}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors text-white shadow-lg shadow-blue-600/20"
                        >
                            Install / Update UE4SS
                        </button>
                    </div>
                    <p className="text-xs text-gray-500">
                        UE4SS is required for many script-based mods. This will download and install the latest version to Binaries/Win64.
                    </p>
                </div>

            </div>
        </div>
    );
};

export default Settings;
