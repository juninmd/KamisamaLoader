import { describe, expect, it } from 'vitest';
import {
  parseLocalMods,
  parseOnlineModsCache,
  parsePersistentCache,
  parseProfiles,
  parseSettings,
} from '../../electron/data-validation';

describe('persisted JSON schemas', () => {
  it('accepts valid persisted data', () => {
    expect(parseSettings('{"gamePath":"D:\\\\Game"}').gamePath).toContain('Game');
    expect(parseLocalMods('[{"id":"1","name":"Aura"}]')).toHaveLength(1);
    expect(parseProfiles('[{"id":"p","name":"Main","modIds":["1"]}]')).toHaveLength(1);
    expect(parseOnlineModsCache('{"timestamp":1,"mods":[]}').mods).toEqual([]);
    expect(parsePersistentCache('{"key":{"data":{},"timestamp":1,"ttl":2}}')).toHaveProperty('key');
  });

  it.each([
    () => parseSettings('{'),
    () => parseSettings('[]'),
    () => parseLocalMods('{}'),
    () => parseLocalMods('[{"id":1}]'),
    () => parseProfiles('[{"id":"p","name":"Main","modIds":"1"}]'),
    () => parseOnlineModsCache('{"timestamp":"now","mods":[]}'),
    () => parsePersistentCache('{"key":{"timestamp":1}}'),
  ])('rejects malformed persisted data', parse => {
    expect(parse).toThrow(/invalid/i);
  });
});
