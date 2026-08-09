interface NavigationEvent {
  preventDefault: () => void;
}

interface SecuredWebContents {
  getURL: () => string;
  on: (event: 'will-navigate', listener: (event: NavigationEvent, url: string) => void) => void;
  setWindowOpenHandler: (
    handler: (details: { url: string }) => { action: 'deny' }
  ) => void;
}

export function isTrustedNavigation(target: string, current: string) {
  try {
    const targetUrl = new URL(target);
    const currentUrl = new URL(current);
    if (currentUrl.protocol === 'file:') {
      return targetUrl.protocol === 'file:' && targetUrl.pathname === currentUrl.pathname;
    }
    return ['http:', 'https:'].includes(targetUrl.protocol)
      && targetUrl.origin === currentUrl.origin;
  } catch {
    return false;
  }
}

const GAMEBANANA_HOSTS = ['gamebanana.com', 'www.gamebanana.com', 'files.gamebanana.com', 'images.gamebanana.com'];

export function isGameBananaUrl(target: string) {
  try {
    const url = new URL(target);
    return url.protocol === 'https:' && GAMEBANANA_HOSTS.includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Reads the mod id out of a GameBanana page or 1-click URL, so a download
 * started inside the built-in browser can go through the normal install flow.
 */
export function extractGameBananaModId(target: string): number | null {
  try {
    const url = new URL(target);
    const idRow = url.searchParams.get('_idRow') || url.searchParams.get('id');
    if (idRow && /^\d+$/.test(idRow)) return parseInt(idRow, 10);

    const parts = url.pathname.split('/').filter(part => part.length > 0);
    const modsIndex = parts.indexOf('mods');
    if (modsIndex !== -1 && /^\d+$/.test(parts[modsIndex + 1] || '')) {
      return parseInt(parts[modsIndex + 1], 10);
    }

    const last = parts[parts.length - 1];
    if (last && /^\d+$/.test(last)) return parseInt(last, 10);
    return null;
  } catch {
    return null;
  }
}

export function configureWindowSecurity(
  webContents: SecuredWebContents,
  openExternal: (url: string) => Promise<void>
) {
  webContents.setWindowOpenHandler(({ url }) => {
    try {
      const protocol = new URL(url).protocol;
      if (protocol === 'http:' || protocol === 'https:') void openExternal(url);
    } catch {
      // Invalid and non-web URLs remain blocked.
    }
    return { action: 'deny' };
  });
  webContents.on('will-navigate', (event, url) => {
    if (!isTrustedNavigation(url, webContents.getURL())) event.preventDefault();
  });
}
