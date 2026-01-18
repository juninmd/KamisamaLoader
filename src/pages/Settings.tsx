import React from 'react';
import { useSettings } from '../components/SettingsContext';

const Settings: React.FC = () => {
  const { settings, updateSettings, selectGameDirectory } = useSettings();

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
            <h3 className="text-lg font-medium text-gray-200">Background Image</h3>
            <div className="flex space-x-2">
                <input
                    type="text"
                    value={settings.backgroundImage || ''}
                    onChange={(e) => updateSettings({ backgroundImage: e.target.value })}
                    placeholder="URL to background image"
                    className="flex-1 bg-black/30 border border-glass-border rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500/50"
                />
            </div>
            <p className="text-xs text-gray-500">
                Paste a URL for your custom background image.
            </p>
        </div>

        <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-200">Appearance</h3>
            <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-500 rounded bg-black/30 border-glass-border" defaultChecked />
                    <span className="text-gray-300">Glass Effect</span>
                </label>
                 <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-500 rounded bg-black/30 border-glass-border" defaultChecked />
                    <span className="text-gray-300">Dark Theme</span>
                </label>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
