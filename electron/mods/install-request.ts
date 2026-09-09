import type { OnlineMod } from '../../shared/types.js';
import type { ModManager } from '../mod-manager.js';

export interface InstallResult { success: boolean; message: string; downloadId?: string }

export const installRequest = {
  installOnlineMod(this: ModManager, mod: OnlineMod): Promise<InstallResult> {
    const existing = this.onlineRequests.get(mod.gameBananaId);
    if (existing) return existing;
    const pending = this.startOnlineInstall(mod);
    this.onlineRequests.set(mod.gameBananaId, pending);
    void pending.then(result => {
      if (!result.downloadId) this.onlineRequests.delete(mod.gameBananaId);
    }, () => this.onlineRequests.delete(mod.gameBananaId));
    return pending;
  },
};
