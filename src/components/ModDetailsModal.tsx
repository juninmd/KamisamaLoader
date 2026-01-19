import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Download, ChevronLeft, ChevronRight, Eye, Heart, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Mod {
    id: string;
    name: string;
    author: string;
    version: string;
    description?: string;
    iconUrl?: string;
    images?: string[];
    viewCount?: number;
    likeCount?: number;
    downloadCount?: number;
    dateAdded?: number;
    category?: string;
    fileSize?: number;
    license?: string;
    submitter?: string;
    isEnabled?: boolean; // Added optional property
}

interface ModDetailsModalProps {
    mod: Mod;
    isOpen: boolean;
    onClose: () => void;
    onInstall: (mod: Mod) => void;
}

const ModDetailsModal: React.FC<ModDetailsModalProps> = ({ mod, isOpen, onClose, onInstall }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const images = mod.images && mod.images.length > 0 ? mod.images : [mod.iconUrl];

    if (!isOpen) return null;

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative mx-4 md:mx-auto">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-red-500/80 rounded-full text-white transition-colors backdrop-blur-md"
                >
                    <X size={20} />
                </button>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Hero / Carousel */}
                    <div className="relative w-full aspect-video max-h-[40vh] bg-black">
                        <img
                            src={images[currentImageIndex]}
                            alt={mod.name}
                            className="w-full h-full object-contain"
                        />

                        {/* Navigation */}
                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); prevImage(); }}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all z-10"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); nextImage(); }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all z-10"
                                >
                                    <ChevronRight size={24} />
                                </button>

                                {/* Indicators */}
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
                                    {images.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentImageIndex(idx)}
                                            className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white w-4' : 'bg-white/40 hover:bg-white/60'}`}
                                        />
                                    ))}
                                </div>
                            </>
                        )}

                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-gray-900 to-transparent">
                            <h2 className="text-3xl font-bold text-white drop-shadow-md line-clamp-2">{mod.name}</h2>
                            <p className="text-gray-300">by {mod.author}</p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 md:p-8 space-y-6">
                        {/* Stats */}
                        <div className="flex items-center space-x-6 text-sm text-gray-400 border-b border-white/5 pb-4">
                            <div className="flex items-center space-x-2">
                                <Eye size={16} />
                                <span>{mod.viewCount?.toLocaleString() || 0} views</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Heart size={16} className="text-red-500" />
                                <span>{mod.likeCount?.toLocaleString() || 0} likes</span>
                            </div>
                            {mod.dateAdded && (
                                <div className="flex items-center space-x-2">
                                    <Calendar size={16} />
                                    <span>Uploaded {formatDistanceToNow(new Date(mod.dateAdded * 1000), { addSuffix: true })}</span>
                                </div>
                            )}
                        </div>

                        {/* Extended Details Grid */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-white/5 p-3 rounded-lg">
                                <span className="block text-gray-500 text-xs uppercase font-bold mb-1">Category</span>
                                <span className="text-white break-words">{mod.category || 'Misc'}</span>
                            </div>
                            <div className="bg-white/5 p-3 rounded-lg">
                                <span className="block text-gray-500 text-xs uppercase font-bold mb-1">Submitter</span>
                                <span className="text-white break-words">{mod.submitter || mod.author}</span>
                            </div>
                            <div className="bg-white/5 p-3 rounded-lg">
                                <span className="block text-gray-500 text-xs uppercase font-bold mb-1">License</span>
                                <span className="text-white break-words">{mod.license || 'All Rights Reserved'}</span>
                            </div>
                            <div className="bg-white/5 p-3 rounded-lg">
                                <span className="block text-gray-500 text-xs uppercase font-bold mb-1">Version</span>
                                <span className="text-white">{mod.version}</span>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <h3 className="text-lg font-bold text-white mb-2">Description</h3>
                            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                                {mod.description}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-md flex justify-end space-x-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        Close
                    </button>
                    <button
                        onClick={() => { onInstall(mod); onClose(); }}
                        className="px-8 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all flex items-center space-x-2"
                    >
                        <Download size={18} />
                        <span>Install Mod</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ModDetailsModal;
