/**
 * Whether to offer the "add to home screen" hint.
 *
 * iOS has no install prompt — `beforeinstallprompt` does not exist there — so
 * the only way in is Safari's share sheet, and the only way a person discovers
 * that is being told. Everywhere else the browser handles installation itself,
 * so the hint would be noise.
 */

interface SafariNavigator {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  /** iOS-only: true when running from the home screen. Not in the DOM types. */
  standalone?: boolean;
}

export function isIOS(nav: SafariNavigator): boolean {
  if (/iPad|iPhone|iPod/.test(nav.userAgent)) return true;
  // iPadOS 13+ reports itself as a Mac; the touch points give it away.
  return nav.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1;
}

/**
 * Every browser on iOS is WebKit underneath, but only Safari can add to the
 * home screen. The others announce themselves in the user agent.
 */
export function isIOSSafari(nav: SafariNavigator): boolean {
  if (!isIOS(nav)) return false;
  return !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(nav.userAgent);
}

export function isInstalled(nav: SafariNavigator, standaloneMedia: boolean): boolean {
  return standaloneMedia || nav.standalone === true;
}

export function shouldOfferInstallHint(
  nav: SafariNavigator,
  standaloneMedia: boolean,
  dismissed: boolean,
): boolean {
  if (dismissed) return false;
  if (isInstalled(nav, standaloneMedia)) return false;
  return isIOSSafari(nav);
}

export const INSTALL_HINT_KEY = 'cadence:install-hint-dismissed';

/**
 * Kept out of the app's own storage on purpose: this is a per-device, per-
 * browser preference, and it has no business travelling through an export.
 */
export function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(INSTALL_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeDismissed(): void {
  try {
    window.localStorage.setItem(INSTALL_HINT_KEY, '1');
  } catch {
    // Private mode: the hint simply comes back next time.
  }
}
