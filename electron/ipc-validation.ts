import type { OnlineMod, SearchOptions, Settings } from '../shared/types.js';

type Data = Record<string, unknown>;

function object(value: unknown, label: string): Data {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`Invalid ${label}.`);
  }
  return value as Data;
}

export function asString(value: unknown, label = 'string', max = 4_096) {
  if (typeof value !== 'string' || value.length > max || value.includes('\0')) {
    throw new TypeError(`Invalid ${label}.`);
  }
  return value;
}

export function asId(value: unknown) {
  const id = asString(value, 'identifier', 128);
  if (!id.trim()) throw new TypeError('Invalid identifier.');
  return id;
}

export function asBoolean(value: unknown) {
  if (typeof value !== 'boolean') throw new TypeError('Invalid boolean.');
  return value;
}

export function asDirection(value: unknown) {
  if (value !== 'up' && value !== 'down') throw new TypeError('Invalid priority direction.');
  return value;
}

export function asPage(value: unknown, fallback = 1) {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 10_000) {
    throw new TypeError('Invalid page.');
  }
  return value as number;
}

export function asPositiveId(value: unknown, label = 'numeric identifier') {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > Number.MAX_SAFE_INTEGER) {
    throw new TypeError(`Invalid ${label}.`);
  }
  return value as number;
}

export function asStringArray(value: unknown) {
  if (!Array.isArray(value) || value.length > 500) throw new TypeError('Invalid identifier list.');
  return value.map(asId);
}

function optionalString(data: Data, key: string, max = 4_096) {
  return data[key] === undefined ? undefined : asString(data[key], `settings.${key}`, max);
}

function choice<T extends string>(value: unknown, choices: readonly T[], label: string) {
  if (typeof value !== 'string' || !choices.includes(value as T)) {
    throw new TypeError(`Invalid ${label}.`);
  }
  return value as T;
}

export function asSettings(value: unknown): Settings {
  const data = object(value, 'settings');
  const gamePath = asString(data.gamePath, 'settings.gamePath', 32_767);
  const opacity = data.backgroundOpacity;
  if (opacity !== undefined && (typeof opacity !== 'number' || opacity < 0 || opacity > 1)) {
    throw new TypeError('Invalid settings.backgroundOpacity.');
  }
  return {
    gamePath,
    modDownloadPath: optionalString(data, 'modDownloadPath', 32_767),
    backgroundImage: optionalString(data, 'backgroundImage'),
    activeProfileId: optionalString(data, 'activeProfileId', 128),
    launchArgs: optionalString(data, 'launchArgs'),
    backgroundOpacity: opacity as number | undefined,
  };
}

export function asOnlineMod(value: unknown): OnlineMod {
  const data = object(value, 'online mod');
  const name = asString(data.name, 'online mod name', 256).trim();
  if (!name || /[\\/]/.test(name)) throw new TypeError('Invalid online mod name.');
  const gameBananaId = asPositiveId(data.gameBananaId, 'online mod identifier');
  return {
    id: typeof data.id === 'string' ? asId(data.id) : String(gameBananaId),
    gameBananaId,
    name,
    author: typeof data.author === 'string' ? asString(data.author, 'online mod author', 256) : '',
    version: typeof data.version === 'string' ? asString(data.version, 'online mod version', 64) : '',
    latestVersion: typeof data.latestVersion === 'string' ? asString(data.latestVersion, 'online mod version', 64) : '',
    description: typeof data.description === 'string' ? asString(data.description, 'online mod description', 20_000) : '',
    isEnabled: false,
    iconUrl: typeof data.iconUrl === 'string' ? asString(data.iconUrl, 'online mod icon') : undefined,
  };
}

export function asSearchOptions(value: unknown): SearchOptions {
  const data = object(value, 'search options');
  const perPage = data.perPage;
  if (perPage !== undefined && (!Number.isInteger(perPage) || (perPage as number) < 1 || (perPage as number) > 100)) {
    throw new TypeError('Invalid results per page.');
  }
  return {
    itemType: data.itemType === undefined ? undefined : choice(data.itemType, ['Mod', 'Sound', 'WiP', 'Skin'] as const, 'item type'),
    page: data.page === undefined ? undefined : asPage(data.page),
    perPage: perPage as number | undefined,
    gameId: data.gameId === undefined ? undefined : asPositiveId(data.gameId, 'game identifier'),
    categoryId: data.categoryId === undefined ? undefined : asPositiveId(data.categoryId, 'category identifier'),
    search: data.search === undefined ? undefined : asString(data.search, 'search', 256),
    sort: data.sort === undefined ? undefined : choice(data.sort, ['downloads', 'views', 'likes', 'date', 'name'] as const, 'sort'),
    order: data.order === undefined ? undefined : choice(data.order, ['asc', 'desc'] as const, 'order'),
    dateRange: data.dateRange === undefined ? undefined : choice(data.dateRange, ['24h', 'week', 'month', 'year', 'all'] as const, 'date range'),
  };
}
