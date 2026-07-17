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
