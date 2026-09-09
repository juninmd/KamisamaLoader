// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUpdateQueue } from '../../src/pages/mods/use-update-queue';
import { LocalMod } from '../../shared/types';
const mod = (id: string, hasUpdate = true) => ({ id, name: id, hasUpdate } as LocalMod);
describe('update queue', () => {
  beforeEach(() => {
    window.electronAPI.updateMod = vi.fn().mockResolvedValue(true);
    window.electronAPI.getInstalledMods = vi.fn().mockResolvedValue([]);
    window.electronAPI.getDownloads = vi.fn().mockResolvedValue([]);
  });
  it('updates selected pending identities once, ignoring duplicate and current entries', async () => {
    const reload = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useUpdateQueue(reload));
    await act(() => result.current.start([mod('a'), mod('a'), mod('current', false)]));
    expect(window.electronAPI.updateMod).toHaveBeenCalledExactlyOnceWith('a');
    expect(result.current.items.map(item => item.state)).toEqual(['completed']);
    expect(reload).toHaveBeenCalledOnce();
  });
  it('finishes the active mod and defers the rest when stopped', async () => {
    let finish!: (value: boolean) => void;
    vi.mocked(window.electronAPI.updateMod).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const { result } = renderHook(() => useUpdateQueue(async () => {}));
    let task!: Promise<void>;
    act(() => { task = result.current.start([mod('a'), mod('b')]); });
    act(() => result.current.stop());
    await act(async () => { finish(true); await task; });
    expect(window.electronAPI.updateMod).toHaveBeenCalledExactlyOnceWith('a');
    expect(result.current.items.map(item => item.state)).toEqual(['completed', 'cancelled']);
    expect(result.current.running).toBe(false);
  });
  it('continues after a failure and retries only failed items', async () => {
    vi.mocked(window.electronAPI.updateMod).mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useUpdateQueue(async () => {}));
    await act(() => result.current.start([mod('a'), mod('b')]));
    expect(result.current.items.map(item => item.state)).toEqual(['failed', 'completed']);
    await act(() => result.current.start(result.current.items.filter(item => item.state === 'failed').map(item => item.mod)));
    expect(vi.mocked(window.electronAPI.updateMod).mock.calls).toEqual([['a'], ['b'], ['a']]);
  });
});
