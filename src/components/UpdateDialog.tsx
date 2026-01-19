import React from 'react';
import ReactDOM from 'react-dom';
import { X, Check, ArrowRight, RefreshCw } from 'lucide-react';

interface Mod {
    id: string;
    name: string;
    iconUrl?: string;
    latestVersion?: string;
}

interface Changelog {
    version: string;
    date: number;
    changes: { cat: string; text: string }[];
    title?: string;
}

interface UpdateDialogProps {
    mod: Mod;
    changelog: Changelog | null;
    isUpdating: boolean;
    onUpdate: () => void;
    onClose: () => void;
}

const UpdateDialog: React.FC<UpdateDialogProps> = ({ mod, changelog, isUpdating, onUpdate, onClose }) => {
    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="p-4 bg-purple-900/30 border-b border-purple-500/20 rounded-t-xl flex justify-between items-center">
                    <h3 className="font-bold text-white text-lg">
                        Update Available
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="flex items-start space-x-4 mb-6">
                        <div className="w-24 h-24 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0 border border-white/10 shadow-lg relative">
                            {mod.iconUrl && <img src={mod.iconUrl} alt="icon" className="w-full h-full object-cover" />}
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent"></div>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{mod.name}</h2>
                            {changelog?.title && <p className="text-purple-300 text-sm mt-1 font-medium">{changelog.title}</p>}
                            <div className="flex items-center space-x-2 mt-2">
                                <span className="bg-white/10 px-2 py-0.5 rounded text-xs text-gray-400">Current Installed</span>
                                <ArrowRight size={14} className="text-gray-500" />
                                <span className="bg-green-600 px-2 py-0.5 rounded text-xs text-white font-bold">New: v{changelog?.version || mod.latestVersion}</span>
                            </div>
                        </div>
                    </div>

                    {/* Changelog */}
                    {changelog && changelog.changes && changelog.changes.length > 0 ? (
                        <div className="bg-black/30 rounded-lg p-4 border border-white/5">
                            <h4 className="text-sm font-bold text-gray-300 mb-3 uppercase tracking-wider">Changes</h4>
                            <div className="space-y-2">
                                {changelog.changes.map((change, idx) => (
                                    <div key={idx} className="flex items-start space-x-3 text-sm">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide mt-0.5 flex-shrink-0 ${change.cat === 'Addition' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                            change.cat === 'Removal' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                                                'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                                            }`}>
                                            {change.cat}
                                        </span>
                                        <span className="text-gray-300 leading-relaxed">{change.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-white/5 rounded-lg text-center text-gray-400 text-sm italic">
                            No detailed changelog available.
                        </div>
                    )}

                    <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-200 text-xs">
                        Note: Updating will overwrite your local changes to this mod.
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-black/20 border-t border-white/10 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        Skip Update
                    </button>
                    <button
                        onClick={onUpdate}
                        disabled={isUpdating}
                        className={`px-6 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all flex items-center space-x-2 ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isUpdating ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                        <span>{isUpdating ? 'Updating...' : 'Yes, Update'}</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default UpdateDialog;
