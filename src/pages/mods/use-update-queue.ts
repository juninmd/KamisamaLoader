import { useRef, useState } from 'react';
import type { LocalMod, FileChangeSummary } from '../../../shared/types';

export type UpdateState = 'queued' | 'updating' | 'completed' | 'failed' | 'cancelled';
export interface UpdateItem { mod: LocalMod; state: UpdateState; summary?: FileChangeSummary; error?: string }
export function useUpdateQueue(reload: () => Promise<void>) {
  const [items, setItems] = useState<UpdateItem[]>([]);
  const [running, setRunning] = useState(false);
  const locked = useRef(false);
  const stopped = useRef(false);
  const start = async (mods: LocalMod[]) => {
    if (locked.current || !mods.length) return;
    locked.current = true; stopped.current = false; setRunning(true);
    const unique = [...new Map(mods.filter(mod => mod.hasUpdate).map(mod => [mod.id, mod])).values()];
    setItems(unique.map(mod => ({ mod, state: 'queued' })));
    const mark = (id: string, state: UpdateState) => setItems(previous => previous.map(item => item.mod.id === id ? { ...item, state } : item));
    try {
      for (const mod of unique) {
        if (stopped.current) { mark(mod.id, 'cancelled'); continue; }
        mark(mod.id, 'updating');
        try {
          const success = await window.electronAPI.updateMod(mod.id);
          mark(mod.id, success ? 'completed' : 'failed');
          try {
            const summary = success ? (await window.electronAPI.getInstalledMods()).find(item => item.id === mod.id)?.lastInstall : undefined;
            const error = success ? undefined : (await window.electronAPI.getDownloads()).slice().reverse().find(item => item.context?.modId === mod.id)?.error;
            setItems(previous => previous.map(item => item.mod.id === mod.id ? { ...item, summary, error } : item));
          } catch { /* The operation result remains valid if optional details cannot be loaded. */ }
        }
        catch { mark(mod.id, 'failed'); }
      }
      await reload();
    } finally { locked.current = false; setRunning(false); }
  };
  return { items, running, start, stop: () => { stopped.current = true; } };
}
