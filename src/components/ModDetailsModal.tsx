import React, { useState, useEffect } from 'react';
import { Download, ChevronLeft, ChevronRight, Eye, Heart, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge, Button, Card, Dialog } from '@juninmd/sonido';
import type { Mod, OnlineMod } from '../../shared/types';
import { Artwork } from './Artwork';

interface ModDetailsModalProps {
    mod: Mod;
    isOpen: boolean;
    onClose: () => void;
    onInstall: (mod: Mod) => void;
}

type ModWithGameBanana = Mod & { gameBananaId?: number; submitterUrl?: string };
type ModDetailsResponse = {
    description?: string;
    images?: string[];
    modPageUrl?: string;
};

type ChangelogEntry = {
    version?: string;
    date?: number;
    text?: string;
};

const ModDetailsModal: React.FC<ModDetailsModalProps> = ({ mod, isOpen, onClose, onInstall }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
    const [fullDescription, setFullDescription] = useState<string>('');
    const [modImages, setModImages] = useState<string[]>([]);
    const [modPageUrl, setModPageUrl] = useState<string>('');
    const gameBananaId = (mod as ModWithGameBanana).gameBananaId || Number(mod.id);

    // Derived images: prioritize fetched images, fallback to prop images
    const displayImages = modImages.length > 0 ? modImages : (mod.images && mod.images.length > 0 ? mod.images : (mod.iconUrl ? [mod.iconUrl] : []));

    useEffect(() => {
        if (!isOpen) {
            setFullDescription('');
            setChangelog([]);
            setModImages([]);
            setModPageUrl('');
            setCurrentImageIndex(0);
            return;
        }

        // Validate that we have a valid GameBanana ID (positive number)
        if (!gameBananaId || Number.isNaN(gameBananaId) || gameBananaId <= 0) {
            console.log('Skipping API calls for invalid or local mod ID:', gameBananaId);
            return;
        }

        // 1. Fetch Changelog
        window.electronAPI.getModChangelog(String(gameBananaId)).then((logs: unknown) => {
            if (Array.isArray(logs)) {
                setChangelog(logs as ChangelogEntry[]);
            } else {
                setChangelog([]);
            }
        }).catch(error => {
            console.error('Failed to get mod changelog:', error);
        });

        // 2. Fetch Full Details
        window.electronAPI.getModDetails(Number(gameBananaId)).then((details: ModDetailsResponse | null | undefined) => {
            if (details) {
                if (details.description) setFullDescription(details.description);
                if (details.images && details.images.length > 0) setModImages(details.images);
                if (details.modPageUrl) setModPageUrl(details.modPageUrl);
            }
        }).catch(error => {
            console.error('Failed to get mod details:', error);
        });
    }, [gameBananaId, isOpen]);

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % displayImages.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
    };

    if (!isOpen) return null;

    return (
        <Dialog
            open
            onClose={onClose}
            title={`${mod.name} details`}
            className="sn-dialog--wide"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                    <Button
                        variant="primary"
                        iconStart={<Download size={18} />}
                        onClick={() => { onInstall(mod); onClose(); }}
                    >
                        Install Mod
                    </Button>
                    {modPageUrl && (
                        <Button
                            href={modPageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="secondary"
                            appearance="outline"
                        >
                            View on GameBanana
                        </Button>
                    )}
                </>
            }
        >
            {/* Hero / Carousel */}
            <div className="relative w-full aspect-video max-h-[40vh] bg-black">
                <Artwork
                    src={displayImages[currentImageIndex]}
                    fallbackSrc={mod.iconUrl}
                    alt={mod.name}
                    className="w-full h-full"
                    imageClassName="object-contain"
                />

                {/* Navigation */}
                {displayImages.length > 1 && (
                    <>
                        <Button
                            onClick={prevImage}
                            aria-label="Previous image"
                            variant="ghost"
                            size="icon"
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-md"
                        >
                            <ChevronLeft size={24} />
                        </Button>
                        <Button
                            onClick={nextImage}
                            aria-label="Next image"
                            variant="ghost"
                            size="icon"
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-md"
                        >
                            <ChevronRight size={24} />
                        </Button>

                        {/* Indicators */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                            {displayImages.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentImageIndex(idx)}
                                    aria-label={`Show image ${idx + 1}`}
                                    aria-current={idx === currentImageIndex}
                                    className={`h-2 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white w-4' : 'bg-white/40 hover:bg-white/60 w-2'}`}
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
                <div className="flex items-center gap-6 text-sm text-gray-400 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-2">
                        <Eye size={16} />
                        <span>{mod.viewCount?.toLocaleString() || 0} views</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Heart size={16} className="text-red-500" />
                        <span>{mod.likeCount?.toLocaleString() || 0} likes</span>
                    </div>
                    {mod.dateAdded && (
                        <div className="flex items-center gap-2">
                            <Calendar size={16} />
                            <span>Uploaded {formatDistanceToNow(new Date(mod.dateAdded * 1000), { addSuffix: true })}</span>
                        </div>
                    )}
                </div>

                {/* Extended Details Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <Card surface="solid" padding="sm">
                        <span className="block text-gray-500 text-xs uppercase font-bold mb-1">Category</span>
                        <span className="text-white break-words">{mod.category || 'Misc'}</span>
                    </Card>
                    <Card surface="solid" padding="sm">
                        <span className="block text-gray-500 text-xs uppercase font-bold mb-1">Submitter</span>
                        {(mod as ModWithGameBanana).submitterUrl ? (
                            <a
                                href={(mod as ModWithGameBanana).submitterUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white break-words hover:text-primary hover:underline transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {(mod as OnlineMod).submitter || mod.author}
                            </a>
                        ) : (
                            <span className="text-white break-words">{(mod as OnlineMod).submitter || mod.author}</span>
                        )}
                    </Card>
                    <Card surface="solid" padding="sm">
                        <span className="block text-gray-500 text-xs uppercase font-bold mb-1">License</span>
                        <span className="text-white break-words">{(mod as OnlineMod).license || 'All Rights Reserved'}</span>
                    </Card>
                    <Card surface="solid" padding="sm">
                        <span className="block text-gray-500 text-xs uppercase font-bold mb-1">Version</span>
                        <span className="text-white">{mod.version}</span>
                    </Card>
                </div>

                {/* Description */}
                <div>
                    <h3 className="text-lg font-bold text-white mb-2">Description</h3>
                    <div
                        className="text-gray-300 leading-relaxed whitespace-pre-wrap break-words prose prose-invert max-w-none [&>img]:rounded-lg [&>img]:max-w-full"
                        dangerouslySetInnerHTML={{ __html: (fullDescription || mod.description || 'No description available.') as string }}
                    />
                </div>

                {/* Changelog */}
                {changelog && changelog.length > 0 && (
                    <div>
                        <h3 className="text-lg font-bold text-white mb-4">Changelog</h3>
                        <div className="space-y-3">
                            {changelog.map((log, index) => (
                                <Card key={index} surface="solid" padding="sm">
                                    <div className="flex justify-between items-center mb-2">
                                        <Badge tone="violet" appearance="soft">{log.version}</Badge>
                                        <span className="text-xs text-gray-400">
                                            {log.date ? formatDistanceToNow(new Date(log.date * 1000), { addSuffix: true }) : ''}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-300 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: log.text || '' }} />
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Dialog>
    );
};

export default ModDetailsModal;
