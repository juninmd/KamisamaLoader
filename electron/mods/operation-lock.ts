import { AsyncLocalStorage } from 'node:async_hooks';
import type { ModManager } from '../mod-manager.js';

// Reentrancy lets profile/repair operations call the same locked primitives.
// One owner serializes every catalog writer, including UI actions during downloads.
export class OperationLock {
  private owner = new AsyncLocalStorage<boolean>();
  private tail: Promise<unknown> = Promise.resolve();
  run<T>(work: () => Promise<T>): Promise<T> {
    if (this.owner.getStore()) return work();
    const pending = this.tail.then(() => this.owner.run(true, work));
    this.tail = pending.catch(() => undefined);
    return pending;
  }
}

export function serializeCatalogOperations(manager: ModManager) {
  const keys = ['getInstalledMods', 'saveSettings', 'checkForUpdates', 'toggleMod', 'uninstallMod',
    'setModOrder', 'setModPriority', 'fixPriorities', 'verifyDeployment', 'loadProfile',
    'createProfile', 'deleteProfile', 'importCloudSync'] as const;
  for (const key of keys) {
    const original = manager[key] as (...args: never[]) => Promise<unknown>;
    Object.defineProperty(manager, key, { configurable: true, writable: true,
      value: (...args: never[]) => manager.withMutation(() => original.apply(manager, args)) });
  }
}
