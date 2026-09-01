import { useState } from 'react';
import { Share, X } from 'lucide-react';
import { readDismissed, shouldOfferInstallHint, writeDismissed } from '@/lib/installHint';

/**
 * A quiet note, shown only in Safari on iOS and only while Cadence is not
 * already on the home screen. Everywhere else the browser offers installation
 * itself, so this would be clutter.
 *
 * It sits in the flow at the end of the day's screen rather than floating over
 * it: nothing to dismiss before you can use the app, and one tap to be rid of
 * it for good.
 */
export function InstallHint() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
    return shouldOfferInstallHint(window.navigator, standalone, readDismissed());
  });

  if (!visible) return null;

  return (
    <aside className="flex items-start gap-3 rounded-lg border border-line bg-surface px-4 py-3.5">
      <span
        aria-hidden
        className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line bg-sunken text-muted"
      >
        <Share size={15} strokeWidth={1.75} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium text-ink">Keep Cadence on your home screen</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">
          Tap Share, then <strong className="font-medium text-ink">Add to Home Screen</strong>. It
          opens in one tap, and your history is no longer cleared when Safari tidies up storage
          after a week away.
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          writeDismissed();
          setVisible(false);
        }}
        aria-label="Dismiss the home screen tip"
        className="touch-target -mt-0.5 -mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-sunken hover:text-ink"
      >
        <X size={15} strokeWidth={1.75} aria-hidden />
      </button>
    </aside>
  );
}
