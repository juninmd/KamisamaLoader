import type { LocalMod, OnlineMod, Profile, Settings } from '../shared/types.js';
import { asSettings } from './ipc-validation.js';

type Data = Record<string, unknown>;

export interface PersistentCacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
}

function decode(text: string, label: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new TypeError(`Invalid ${label} JSON.`);
  }
}

function record(value: unknown, label: string): Data {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`Invalid ${label}.`);
  }
  return value as Data;
}

function optionalType(data: Data, key: string, type: 'string' | 'number' | 'boolean', label: string) {
  if (data[key] !== undefined && typeof data[key] !== type) {
    throw new TypeError(`Invalid ${label}.${key}.`);
  }
}

export function parseSettings(text: string): Settings {
  return asSettings(decode(text, 'settings'));
}

export function parseLocalMods(text: string): LocalMod[] {
  const value = decode(text, 'mods');
  if (!Array.isArray(value)) throw new TypeError('Invalid mods list.');
  return value.map((item) => {
    const mod = record(item, 'mod');
    if (typeof mod.id !== 'string' || !mod.id) throw new TypeError('Invalid mod.id.');
    optionalType(mod, 'name', 'string', 'mod');
    optionalType(mod, 'folderPath', 'string', 'mod');
    optionalType(mod, 'isEnabled', 'boolean', 'mod');
    optionalType(mod, 'priority', 'number', 'mod');
    optionalType(mod, 'gameBananaId', 'number', 'mod');
    return mod as unknown as LocalMod;
  });
}

export function parseProfiles(text: string): Profile[] {
  const value = decode(text, 'profiles');
  if (!Array.isArray(value)) throw new TypeError('Invalid profiles list.');
  return value.map((item) => {
    const profile = record(item, 'profile');
    if (typeof profile.id !== 'string' || typeof profile.name !== 'string'
      || !Array.isArray(profile.modIds) || !profile.modIds.every(id => typeof id === 'string')) {
      throw new TypeError('Invalid profile.');
    }
    return profile as unknown as Profile;
  });
}

export function parseOnlineModsCache(text: string): { timestamp: number; mods: OnlineMod[] } {
  const cache = record(decode(text, 'online mods cache'), 'online mods cache');
  if (typeof cache.timestamp !== 'number' || !Array.isArray(cache.mods)
    || !cache.mods.every(mod => !!mod && typeof mod === 'object' && !Array.isArray(mod))) {
    throw new TypeError('Invalid online mods cache.');
  }
  return cache as { timestamp: number; mods: OnlineMod[] };
}

export function parsePersistentCache(text: string): Record<string, PersistentCacheEntry> {
  const cache = record(decode(text, 'persistent cache'), 'persistent cache');
  for (const [key, value] of Object.entries(cache)) {
    const entry = record(value, `persistent cache entry ${key}`);
    if (!('data' in entry) || typeof entry.timestamp !== 'number' || typeof entry.ttl !== 'number') {
      throw new TypeError(`Invalid persistent cache entry ${key}.`);
    }
  }
  return cache as Record<string, PersistentCacheEntry>;
}
