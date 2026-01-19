import React, { useState, useEffect } from 'react';
import { Save, Trash2, ChevronDown, Folder, Plus } from 'lucide-react';
import { useToast } from './ToastContext';

interface Profile {
    id: string;
    name: string;
    modIds: string[];
}

interface ProfileManagerProps {
    onProfileLoaded: () => void;
}

const ProfileManager: React.FC<ProfileManagerProps> = ({ onProfileLoaded }) => {
    const { showToast } = useToast();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const [loadingProfileId, setLoadingProfileId] = useState<string | null>(null);

    useEffect(() => {
        loadProfiles();
    }, []);

    const loadProfiles = async () => {
        try {
            const data = await window.electronAPI.getProfiles();
            setProfiles(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleCreate = async () => {
        if (!newProfileName.trim()) return;
        try {
            const result = await window.electronAPI.createProfile(newProfileName);
            if (result.success) {
                showToast('Profile saved successfully', 'success');
                setNewProfileName('');
                setIsCreating(false);
                loadProfiles();
            } else {
                showToast(result.message || 'Failed to save profile', 'error');
            }
        } catch (e) {
            showToast('Failed to save profile', 'error');
        }
    };

    const handleLoad = async (profile: Profile) => {
        if (loadingProfileId) return;
        setLoadingProfileId(profile.id);
        showToast(`Loading profile: ${profile.name}...`, 'info');

        // Small delay to let UI render the loading state
        setTimeout(async () => {
            try {
                const result = await window.electronAPI.loadProfile(profile.id);
                if (result.success) {
                    showToast(`Profile "${profile.name}" loaded`, 'success');
                    onProfileLoaded(); // Trigger refresh of mod list
                    setIsOpen(false);
                } else {
                    showToast(result.message || 'Failed to load profile', 'error');
                }
            } catch (e) {
                showToast('Failed to load profile', 'error');
            } finally {
                setLoadingProfileId(null);
            }
        }, 100);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this profile?')) return;

        try {
            const success = await window.electronAPI.deleteProfile(id);
            if (success) {
                showToast('Profile deleted', 'success');
                loadProfiles();
            } else {
                showToast('Failed to delete profile', 'error');
            }
        } catch (e) {
            showToast('Failed to delete profile', 'error');
        }
    };

    return (
        <div className="relative z-50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl text-sm font-medium border border-white/10 transition-colors"
                title="Manage Mod Profiles"
            >
                <Folder size={16} className="text-blue-400" />
                <span>Profiles</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute right-0 top-full mt-2 w-72 bg-[#1a1b26] border border-white/10 rounded-xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between px-2 py-2 mb-2 border-b border-white/5">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Saved Loadouts</span>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="p-1 hover:bg-white/10 rounded-lg text-blue-400 transition-colors"
                                title="Create New Profile"
                            >
                                <Plus size={16} />
                            </button>
                        </div>

                        {/* List */}
                        <div className="max-h-60 overflow-y-auto space-y-1 mb-2">
                            {profiles.length === 0 && !isCreating ? (
                                <div className="text-center py-6 text-gray-500 text-sm">
                                    No profiles saved.
                                </div>
                            ) : (
                                profiles.map(profile => (
                                    <div
                                        key={profile.id}
                                        onClick={() => handleLoad(profile)}
                                        className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${loadingProfileId === profile.id ? 'bg-blue-600/20 text-blue-200' : 'hover:bg-white/5 text-gray-300'}`}
                                    >
                                        <div className="flex items-center space-x-3 truncate">
                                            {loadingProfileId === profile.id ? (
                                                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <div className="w-4 h-4 flex items-center justify-center">
                                                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full group-hover:bg-blue-400 transition-colors"></div>
                                                </div>
                                            )}
                                            <div className="flex flex-col truncate">
                                                <span className="font-medium text-sm truncate">{profile.name}</span>
                                                <span className="text-[10px] text-gray-500">{profile.modIds.length} mods</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(e, profile.id)}
                                            className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Create Input */}
                        {isCreating && (
                            <div className="p-2 bg-black/20 rounded-lg border border-white/5 animate-in slide-in-from-top-2">
                                <input
                                    type="text"
                                    placeholder="Profile Name..."
                                    value={newProfileName}
                                    onChange={(e) => setNewProfileName(e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 mb-2"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                />
                                <div className="flex items-center justify-end space-x-2">
                                    <button
                                        onClick={() => setIsCreating(false)}
                                        className="text-xs text-gray-400 hover:text-white px-2 py-1"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreate}
                                        disabled={!newProfileName.trim()}
                                        className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs font-bold disabled:opacity-50"
                                    >
                                        <Save size={12} />
                                        <span>Save</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default ProfileManager;
