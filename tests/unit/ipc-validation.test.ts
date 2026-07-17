import { describe, expect, it } from 'vitest';
import {
  asBoolean,
  asDirection,
  asId,
  asOnlineMod,
  asPage,
  asSettings,
  asSearchOptions,
  asString,
  asStringArray,
} from '../../electron/ipc-validation';

describe('IPC validation', () => {
  it('accepts valid settings and strips unknown keys', () => {
    expect(asSettings({ gamePath: 'D:\\Game', backgroundOpacity: 0.5, admin: true }))
      .toEqual({ gamePath: 'D:\\Game', backgroundOpacity: 0.5 });
  });

  it.each([
    null,
    { gamePath: 42 },
    { gamePath: 'ok', backgroundOpacity: 2 },
    { gamePath: 'bad\0path' },
  ])('rejects invalid settings', value => {
    expect(() => asSettings(value)).toThrow(/settings/i);
  });

  it('validates bounded primitive IPC values', () => {
    expect(asId('mod-1')).toBe('mod-1');
    expect(asPage(undefined)).toBe(1);
    expect(asBoolean(false)).toBe(false);
    expect(asStringArray(['a', 'b'])).toEqual(['a', 'b']);
    expect(() => asId('')).toThrow();
    expect(() => asPage(-1)).toThrow();
    expect(() => asBoolean('false')).toThrow();
    expect(() => asStringArray(Array(501).fill('x'))).toThrow();
  });

  it('accepts an installable online mod and rejects forged data', () => {
    expect(asOnlineMod({ gameBananaId: 42, name: 'Aura', author: 'QA' }).gameBananaId).toBe(42);
    expect(() => asOnlineMod({ gameBananaId: 0, name: 'Aura' })).toThrow(/online mod/i);
    expect(() => asOnlineMod({ gameBananaId: 42, name: '../Aura' })).toThrow(/online mod/i);
  });

  it('validates search options without forwarding unknown fields', () => {
    expect(asSearchOptions({
      itemType: 'Mod', page: 2, perPage: 20, gameId: 21179, categoryId: 3,
      search: 'goku', sort: 'downloads', order: 'desc', dateRange: 'week', admin: true,
    })).toEqual({
      itemType: 'Mod', page: 2, perPage: 20, gameId: 21179, categoryId: 3,
      search: 'goku', sort: 'downloads', order: 'desc', dateRange: 'week',
    });
    expect(() => asSearchOptions({ perPage: 101 })).toThrow();
    expect(() => asSearchOptions({ sort: 'unsafe' })).toThrow();
  });

  it('rejects malformed strings, identifiers, and directions', () => {
    expect(asDirection('up')).toBe('up');
    expect(asString('ok')).toBe('ok');
    expect(() => asDirection('left')).toThrow();
    expect(() => asString('bad\0value')).toThrow();
    expect(() => asString('long', 'short', 3)).toThrow();
  });
});
