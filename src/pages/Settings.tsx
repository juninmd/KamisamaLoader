import React from 'react';
import { Button, Card, TextField } from '@juninmd/sonido';
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
        } catch {
            showToast('Failed to install UE4SS', 'error');
        }
    };

    const [showAdvanced, setShowAdvanced] = React.useState(false);

    return (
        <div className="space-y-6 pb-12">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                    Settings
                </h1>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {/* General Settings Card */}
                <Card surface="glass" className="p-6 space-y-6">
                    <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2 mb-4">General</h2>

                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-300">Game Directory</h3>
                        <div className="flex gap-2 items-end">
                            <TextField
                                label="Game directory"
                                hideLabel
                                value={settings.gamePath}
                                readOnly
                                placeholder="Path to Dragon Ball: Sparking! ZERO executable"
                                className="flex-1"
                            />
                            <Button variant="secondary" onClick={selectGameDirectory}>
                                Browse
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-300">Mod Storage Directory</h3>
                        <div className="flex gap-2 items-end">
                            <TextField
                                label="Mod storage directory"
                                hideLabel
                                value={settings.modDownloadPath || ''}
                                readOnly
                                placeholder="Default internal directory"
                                className="flex-1"
                            />
                            <Button variant="secondary" onClick={selectModDirectory}>
                                Browse
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2 border-t border-white/10 pt-4 mt-2">
                        <h3 className="text-sm font-medium text-gray-300">Tools &amp; Core Mods</h3>
                        <Button variant="secondary" appearance="outline" className="w-full mt-2" onClick={handleInstallUE4SS}>
                            Install / Update UE4SS
                        </Button>
                        <p className="text-xs text-gray-500 text-center mt-2">Required for script-based mods.</p>
                    </div>
                </Card>

                {/* Appearance & Cloud Sync Card */}
                <Card surface="glass" className="p-6 space-y-6">
                    <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2 mb-4">Appearance</h2>

                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-300">Background Image</h3>
                        <div className="flex gap-2 items-end">
                            <TextField
                                label="Background image"
                                hideLabel
                                value={settings.backgroundImage || ''}
                                onChange={(e) => updateSettings({ backgroundImage: e.target.value })}
                                placeholder="URL or Path to background image"
                                className="flex-1"
                            />
                            <Button variant="secondary" onClick={selectBackgroundImage}>
                                Browse
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <h3 className="text-sm font-medium text-gray-300">Background Opacity</h3>
                            <span className="text-xs font-medium text-gray-400">
                                {Math.round((settings.backgroundOpacity !== undefined ? settings.backgroundOpacity : 0.7) * 100)}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={settings.backgroundOpacity !== undefined ? settings.backgroundOpacity : 0.7}
                            onChange={(e) => updateSettings({ backgroundOpacity: parseFloat(e.target.value) })}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2 mt-8 mb-4">Cloud Sync &amp; Backup</h2>

                    <div className="flex flex-col space-y-3">
                        <Button
                            variant="secondary"
                            appearance="outline"
                            className="w-full"
                            onClick={async () => {
                                showToast('Exporting data...', 'info');
                                const res = await window.electronAPI.exportCloudSync();
                                showToast(res.message, res.success ? 'success' : 'error');
                            }}
                        >
                            Export to Cloud Zip
                        </Button>

                        <Button
                            variant="secondary"
                            appearance="outline"
                            className="w-full"
                            onClick={async () => {
                                showToast('Importing data...', 'info');
                                const res = await window.electronAPI.importCloudSync();
                                showToast(res.message, res.success ? 'success' : 'error');
                            }}
                        >
                            Import from Cloud Zip
                        </Button>
                        <p className="text-xs text-gray-500 text-center">Export to or import from a shared cloud folder (e.g. Dropbox).</p>
                    </div>
                </Card>
            </div>

            {/* Advanced Settings Toggle */}
            <div className="flex justify-center mt-6">
                <Button variant="link" onClick={() => setShowAdvanced(!showAdvanced)}>
                    {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
                </Button>
            </div>

            {/* Advanced Settings Section */}
            {showAdvanced && (
                <Card surface="glass" className="p-6 space-y-6 mt-4 animate-in fade-in duration-200">
                    <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2 mb-4">Advanced</h2>
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-300">Launch Arguments</h3>
                        <TextField
                            label="Launch arguments"
                            hideLabel
                            value={settings.launchArgs || ''}
                            onChange={(e) => updateSettings({ launchArgs: e.target.value })}
                            placeholder="-dx11 -windowed"
                        />
                        <p className="text-xs text-gray-500">Custom arguments passed to the game executable on launch.</p>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default Settings;
