import { describe, expect, it } from 'vitest';
import { isIOS, isIOSSafari, isInstalled, shouldOfferInstallHint } from './installHint';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1';
const IPHONE_FIREFOX =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/127.0 Mobile/15E148 Safari/605.1.15';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const IPAD_OS =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';

const nav = (userAgent: string, extra: Record<string, unknown> = {}) => ({
  userAgent,
  platform: 'iPhone',
  maxTouchPoints: 5,
  ...extra,
});

describe('isIOS', () => {
  it('recognises an iPhone', () => {
    expect(isIOS(nav(IPHONE_SAFARI))).toBe(true);
  });

  it('recognises an iPad that reports itself as a Mac', () => {
    // iPadOS 13+ sends a desktop user agent; the touch points are the tell.
    expect(isIOS(nav(IPAD_OS, { platform: 'MacIntel', maxTouchPoints: 5 }))).toBe(true);
  });

  it('does not mistake a real Mac for an iPad', () => {
    expect(isIOS(nav(MAC_SAFARI, { platform: 'MacIntel', maxTouchPoints: 0 }))).toBe(false);
  });

  it('is false on Android', () => {
    expect(isIOS(nav(ANDROID_CHROME, { platform: 'Linux armv8l' }))).toBe(false);
  });
});

describe('isIOSSafari', () => {
  it('is true only in Safari', () => {
    expect(isIOSSafari(nav(IPHONE_SAFARI))).toBe(true);
  });

  it('is false in the other iOS browsers, which cannot add to the home screen', () => {
    expect(isIOSSafari(nav(IPHONE_CHROME))).toBe(false);
    expect(isIOSSafari(nav(IPHONE_FIREFOX))).toBe(false);
  });

  it('is false on Android and desktop', () => {
    expect(isIOSSafari(nav(ANDROID_CHROME, { platform: 'Linux armv8l' }))).toBe(false);
    expect(isIOSSafari(nav(MAC_SAFARI, { platform: 'MacIntel', maxTouchPoints: 0 }))).toBe(false);
  });
});

describe('isInstalled', () => {
  it('reads the iOS-only standalone flag', () => {
    expect(isInstalled(nav(IPHONE_SAFARI, { standalone: true }), false)).toBe(true);
  });

  it('reads the display-mode media query used everywhere else', () => {
    expect(isInstalled(nav(ANDROID_CHROME), true)).toBe(true);
  });

  it('is false in a normal browser tab', () => {
    expect(isInstalled(nav(IPHONE_SAFARI), false)).toBe(false);
  });
});

describe('shouldOfferInstallHint', () => {
  it('offers the hint in Safari on iOS, uninstalled and not dismissed', () => {
    expect(shouldOfferInstallHint(nav(IPHONE_SAFARI), false, false)).toBe(true);
  });

  it('stays hidden once dismissed', () => {
    expect(shouldOfferInstallHint(nav(IPHONE_SAFARI), false, true)).toBe(false);
  });

  it('stays hidden inside the installed app', () => {
    // The two ways a launcher reports itself, both must silence the hint.
    expect(shouldOfferInstallHint(nav(IPHONE_SAFARI, { standalone: true }), false, false)).toBe(
      false,
    );
    expect(shouldOfferInstallHint(nav(IPHONE_SAFARI), true, false)).toBe(false);
  });

  it('never appears on Android, desktop, or a non-Safari iOS browser', () => {
    expect(shouldOfferInstallHint(nav(ANDROID_CHROME, { platform: 'Linux armv8l' }), false, false))
      .toBe(false);
    expect(
      shouldOfferInstallHint(nav(MAC_SAFARI, { platform: 'MacIntel', maxTouchPoints: 0 }), false, false),
    ).toBe(false);
    expect(shouldOfferInstallHint(nav(IPHONE_CHROME), false, false)).toBe(false);
  });
});
