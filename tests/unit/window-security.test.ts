import { describe, expect, it, vi } from 'vitest';
import { configureWindowSecurity, isTrustedNavigation } from '../../electron/window-security';

describe('window navigation policy', () => {
  it.each([
    ['file:///app/index.html', 'file:///app/index.html#mods'],
    ['http://localhost:5173/', 'http://localhost:5173/mods'],
  ])('allows same application navigation', (current, target) => {
    expect(isTrustedNavigation(target, current)).toBe(true);
  });

  it.each([
    ['file:///app/index.html', 'file:///other/secret.html'],
    ['https://app.local/', 'https://evil.example/'],
    ['https://app.local/', 'javascript:alert(1)'],
  ])('blocks navigation outside the application', (current, target) => {
    expect(isTrustedNavigation(target, current)).toBe(false);
  });

  it('opens only web popups and blocks top-level external navigation', async () => {
    const handlers: Record<string, (...args: any[]) => any> = {};
    const contents = {
      getURL: () => 'https://app.local/',
      setWindowOpenHandler: vi.fn((handler) => { handlers.popup = handler; }),
      on: vi.fn((event, handler) => { handlers[event] = handler; }),
    };
    const openExternal = vi.fn().mockResolvedValue(undefined);
    configureWindowSecurity(contents as any, openExternal);

    expect(handlers.popup({ url: 'https://docs.example/' })).toEqual({ action: 'deny' });
    handlers.popup({ url: 'javascript:alert(1)' });
    handlers.popup({ url: 'not a url' });
    expect(openExternal).toHaveBeenCalledOnce();

    const allowed = { preventDefault: vi.fn() };
    const blocked = { preventDefault: vi.fn() };
    handlers['will-navigate'](allowed, 'https://app.local/mods');
    handlers['will-navigate'](blocked, 'https://evil.example/');
    expect(allowed.preventDefault).not.toHaveBeenCalled();
    expect(blocked.preventDefault).toHaveBeenCalledOnce();
  });
});
