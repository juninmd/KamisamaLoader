import { useState } from 'react';
import type { Mod, ModChangelog } from '../../../shared/types';
import { useToast } from '../../components/ToastContext';

export function useSingleUpdate(reload: () => Promise<void>) {
  const { showToast } = useToast();
  const [mod, setMod] = useState<Mod | null>(null);
  const [changelog, setChangelog] = useState<ModChangelog | null>(null);
  const [updating, setUpdating] = useState(false);
  const open = async (selected: Mod) => {
    try { setChangelog(await window.electronAPI.getModChangelog(selected.id)); }
    catch { setChangelog(null); }
    setMod(selected);
  };
  const update = async () => {
    if (!mod || updating) return;
    setUpdating(true);
    try {
      const success = await window.electronAPI.updateMod(mod.id);
      showToast(success ? 'Mod updated successfully' : 'Failed to update mod', success ? 'success' : 'error');
      await reload();
    } catch { showToast('Failed to update mod', 'error'); }
    finally { setUpdating(false); setMod(null); }
  };
  return { mod, changelog, updating, open, update, close: () => { if (!updating) setMod(null); } };
}
