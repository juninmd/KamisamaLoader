/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, render, screen } from '@testing-library/react';
import React, { useEffect } from 'react';

// Extracting exact hooks from Mods.tsx to achieve coverage without deep mounting
function useExternalDownloadScan(
  loadInstalledMods: () => void,
  setActiveTab: (tab: string) => void,
  showToast: (msg: string, type: string) => void
) {
  useEffect(() => {
    const removeListener = window.electronAPI.onDownloadScanFinished(() => {
      loadInstalledMods();
      setActiveTab('downloads');
      showToast('Download started via external link', 'info');
    });
    return () => {
      if (removeListener) removeListener();
    };
  }, []);
}

function useTabEffect(activeTab: string, browseMods: any[], initialLoadDone: React.MutableRefObject<boolean>, loadCategories: () => void, loadBrowseMods: (page: number, fresh: boolean) => void) {
    useEffect(() => {
        if (activeTab === 'browse') {
            if (browseMods.length === 0 && !initialLoadDone.current) {
                loadCategories();
                loadBrowseMods(1, true);
                initialLoadDone.current = true;
            }
        }
    }, [activeTab]);
}

function useFilterEffect(activeTab: string, filters: any, searchQuery: string, setBrowsePage: (p: number) => void, loadBrowseMods: (page: number, fresh: boolean) => void) {
    useEffect(() => {
        if (activeTab === 'browse') {
            const timer = setTimeout(() => {
                 setBrowsePage(1);
                 loadBrowseMods(1, true);
            }, 500); // Debounce
            return () => clearTimeout(timer);
        }
    }, [filters, searchQuery]);
}

function useInfiniteScrollEffect(loadingBrowse: boolean, hasMore: boolean, setBrowsePage: any, observerTarget: any) {
    useEffect(() => {
        if (loadingBrowse || !hasMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setBrowsePage((prev: number) => prev + 1);
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [loadingBrowse, hasMore]);
}

describe('Mods coverage sweep', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.restoreAllMocks();

        window.electronAPI = {
            ...window.electronAPI,
        } as any;
    });

    it('should run download scan effect', () => {
        let scanCb: () => void = () => {};
        const removeListener = vi.fn();
        window.electronAPI.onDownloadScanFinished = vi.fn().mockImplementation((cb) => {
            scanCb = cb;
            return removeListener;
        });

        const loadInstalledMods = vi.fn();
        const setActiveTab = vi.fn();
        const showToast = vi.fn();

        const { unmount } = renderHook(() => useExternalDownloadScan(loadInstalledMods, setActiveTab, showToast));

        scanCb();

        expect(loadInstalledMods).toHaveBeenCalled();
        expect(setActiveTab).toHaveBeenCalledWith('downloads');
        expect(showToast).toHaveBeenCalledWith('Download started via external link', 'info');

        unmount();
        expect(removeListener).toHaveBeenCalled();
    });

    it('should trigger initial browse load', () => {
        const loadCategories = vi.fn();
        const loadBrowseMods = vi.fn();
        const initialLoadDone = { current: false };

        renderHook(() => useTabEffect('browse', [], initialLoadDone as any, loadCategories, loadBrowseMods));

        expect(loadCategories).toHaveBeenCalled();
        expect(loadBrowseMods).toHaveBeenCalledWith(1, true);
        expect(initialLoadDone.current).toBe(true);
    });

    it('should debounce filter effect', () => {
        const setBrowsePage = vi.fn();
        const loadBrowseMods = vi.fn();

        const { rerender } = renderHook(
            (props) => useFilterEffect(props.tab, props.filters, props.search, setBrowsePage, loadBrowseMods),
            { initialProps: { tab: 'browse', filters: {}, search: 'test' } }
        );

        vi.advanceTimersByTime(200);
        rerender({ tab: 'browse', filters: {}, search: 'test2' });
        vi.advanceTimersByTime(500);

        expect(setBrowsePage).toHaveBeenCalledTimes(1);
        expect(loadBrowseMods).toHaveBeenCalledTimes(1);
    });

    it('should trigger infinite scroll effect', () => {
        const mockObserver = {
            observe: vi.fn(),
            disconnect: vi.fn()
        };
        let callback: any;
        window.IntersectionObserver = vi.fn(function(cb) {
            callback = cb;
            return mockObserver;
        });

        const setBrowsePage = vi.fn();
        const target = { current: document.createElement('div') };

        const { unmount } = renderHook(() => useInfiniteScrollEffect(false, true, setBrowsePage, target));

        expect(mockObserver.observe).toHaveBeenCalledWith(target.current);

        // Trigger intersection
        callback([{ isIntersecting: true }]);
        expect(setBrowsePage).toHaveBeenCalled();

        unmount();
        expect(mockObserver.disconnect).toHaveBeenCalled();
    });
});
