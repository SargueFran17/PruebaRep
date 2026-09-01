import { useEffect } from 'react';
import type { ThemePreference } from '@/domain/types';

/**
 * Resolves the theme preference onto `<html data-theme>`. All palette tokens
 * are re-declared under that attribute, so the whole UI flips without any
 * component knowing about themes.
 */
export function useTheme(preference: ThemePreference, reduceMotion: boolean): void {
  useEffect(() => {
    const root = document.documentElement;

    // Older browsers and non-DOM environments may not expose matchMedia.
    const query =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;

    const apply = (): void => {
      const prefersDark = query?.matches ?? false;
      const resolved = preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference;
      root.dataset.theme = resolved;
      root.style.colorScheme = resolved;
    };

    apply();
    if (preference !== 'system' || !query) return;

    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [preference]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = reduceMotion ? 'true' : 'false';
  }, [reduceMotion]);
}
