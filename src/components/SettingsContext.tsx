import React, { createContext, useContext, useState, useEffect } from 'react';

interface Settings {
    gamePath: string;
    modDownloadPath?: string;
    backgroundImage?: string;
}

interface SettingsContextType {
    settings: Settings;
    updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
    selectGameDirectory: () => Promise<void>;
    selectModDirectory: () => Promise<void>;
    loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<Settings>({ gamePath: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await window.electronAPI.getSettings();
            setSettings(data);
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateSettings = async (newSettings: Partial<Settings>) => {
        const merged = { ...settings, ...newSettings };
        setSettings(merged);
        await window.electronAPI.saveSettings(merged);
    };

    const selectGameDirectory = async () => {
        try {
            const path = await window.electronAPI.selectGameDirectory();
            if (path) {
                await updateSettings({ gamePath: path });
            }
        } catch (error) {
            console.error('Failed to select game directory:', error);
        }
    };

    const selectModDirectory = async () => {
        try {
            const path = await window.electronAPI.selectModDirectory();
            if (path) {
                await updateSettings({ modDownloadPath: path });
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, selectGameDirectory, selectModDirectory, loading }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
