import { useCallback, useEffect, useState } from 'react';
import type { LocalMod, Mod, OnlineMod } from '../../../shared/types';
import { useToast } from '../../components/ToastContext';

export function useLibrary() {
  const { showToast } = useToast();
  const [mods, setMods] = useState<LocalMod[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    try { setMods(await window.electronAPI.getInstalledMods()); setError(''); }
    catch (error) { console.error('Failed to load installed mods', error); setError('Não foi possível carregar sua biblioteca. Tente novamente.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void reload();
    return window.electronAPI.onDownloadScanFinished?.(() => { void reload(); });
  }, [reload]);
  const check = async () => {
    setChecking(true);
    try { await window.electronAPI.checkForUpdates(); await reload(); }
    catch (error) { console.error(error); showToast('Não foi possível verificar atualizações. Tente novamente.', 'error'); }
    finally { setChecking(false); }
  };
  const repair = async () => {
    setRepairing(true);
    try {
      const result = await window.electronAPI.verifyDeployment();
      showToast(result.broken.length ? `Arquivos locais ausentes: ${result.broken.join(', ')}`
        : result.repaired.length ? `${result.repaired.length} mods reparados.` : 'Todos os mods já estão instalados.',
      result.broken.length ? 'error' : 'success');
      await reload();
    } catch { showToast('Falha ao reparar mods.', 'error'); }
    finally { setRepairing(false); }
  };
  const toggle = async (id: string) => {
    const mod = mods.find(item => item.id === id);
    if (!mod) return;
    try {
      const result = await window.electronAPI.toggleMod(id, !mod.isEnabled);
      if (!result.success) throw new Error('Toggle failed');
      if (result.conflict) showToast(result.conflict, 'info');
      await reload();
    } catch { showToast('Não foi possível alterar o mod.', 'error'); }
  };
  const install = async (mod: Mod) => {
    try {
      const result = await window.electronAPI.installOnlineMod(mod as OnlineMod);
      showToast(result.message || (result.success ? 'Download adicionado à fila.' : 'Falha na instalação.'),
        result.success ? 'success' : 'error');
      if (!result.downloadId) await reload();
      return result.success;
    } catch { showToast('Falha ao iniciar instalação.', 'error'); return false; }
  };
  const uninstall = async (id: string) => {
    if (!window.confirm('Remover este mod da biblioteca e do jogo?')) return;
    try {
      const result = await window.electronAPI.uninstallMod(id);
      if (!result.success) throw new Error(result.message);
      showToast('Mod uninstalled successfully', 'success');
      await reload();
    } catch { showToast('Não foi possível remover o mod.', 'error'); }
  };
  const reorder = async (visible: string[]) => {
    const full = [...mods].sort((a, b) => b.priority - a.priority).map(item => item.id);
    let index = 0;
    const ids = full.map(id => visible.includes(id) ? visible[index++] : id);
    try { if (!await window.electronAPI.setModOrder(ids)) throw new Error('Order failed'); await reload(); }
    catch { showToast('Não foi possível salvar a ordem.', 'error'); }
  };
  const priority = async (id: string, direction: 'up' | 'down') => {
    try { if (!await window.electronAPI.setModPriority(id, direction)) throw new Error('Priority failed'); await reload(); }
    catch { showToast('Não foi possível salvar a prioridade.', 'error'); }
  };
  const drop = async (files: FileList) => {
    for (const file of Array.from(files)) {
      try {
        const result = await window.electronAPI.installMod((file as File & { path: string }).path);
        showToast(result.message || (result.success ? 'Mod installed successfully' : 'Installation failed'), result.success ? 'success' : 'error');
      } catch { showToast(`Falha ao instalar ${file.name}.`, 'error'); }
    }
    await reload();
  };
  return { mods, loading, error, checking, repairing, reload, check, repair, toggle, install, uninstall, reorder, priority, drop };
}
