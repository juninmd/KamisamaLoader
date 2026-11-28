import React from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { Alert, Badge, Button, Dialog } from '@juninmd/sonido';
import { Artwork } from './Artwork';

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

const catTone = (cat: string) => {
    if (cat === 'Addition') return 'violet' as const;
    if (cat === 'Removal') return 'danger' as const;
    return 'neutral' as const;
};

const UpdateDialog: React.FC<UpdateDialogProps> = ({ mod, changelog, isUpdating, onUpdate, onClose }) => (
    <Dialog
        open
        onClose={onClose}
        title="Update Available"
        footer={
            <>
                <Button variant="ghost" onClick={onClose}>
                    Skip Update
                </Button>
                <Button
                    variant="primary"
                    onClick={onUpdate}
                    loading={isUpdating}
                    iconStart={isUpdating ? undefined : <Check size={16} />}
                >
                    {isUpdating ? 'Updating...' : 'Yes, Update'}
                </Button>
            </>
        }
    >
        <div className="flex items-start gap-4 mb-4">
            <div className="w-24 h-24 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0 border border-white/10 shadow-lg relative">
                <Artwork src={mod.iconUrl} alt={mod.name} className="w-full h-full" imageClassName="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
            </div>
            <div>
                <h3 className="text-xl font-bold text-white">{mod.name}</h3>
                {changelog?.title && <p className="text-primary text-sm mt-1 font-medium">{changelog.title}</p>}
                <div className="flex items-center gap-2 mt-2">
                    <Badge tone="neutral" appearance="soft">Current Installed</Badge>
                    <ArrowRight size={14} className="text-gray-500" />
                    <Badge tone="success" appearance="solid">
                        New: v{changelog?.version || mod.latestVersion}
                    </Badge>
                </div>
            </div>
        </div>

        {changelog && changelog.changes && changelog.changes.length > 0 ? (
            <div className="bg-black/30 rounded-lg p-4 border border-white/5">
                <h4 className="text-sm font-bold text-gray-300 mb-3 uppercase tracking-wider">Changes</h4>
                <div className="space-y-2">
                    {changelog.changes.map((change, idx) => (
                        <div key={idx} className="flex items-start gap-3 text-sm">
                            <Badge tone={catTone(change.cat)} appearance="soft" className="mt-0.5 flex-shrink-0">
                                {change.cat}
                            </Badge>
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

        <Alert tone="info" className="mt-4">
            Note: Updating will overwrite your local changes to this mod.
        </Alert>
    </Dialog>
);

export default UpdateDialog;
