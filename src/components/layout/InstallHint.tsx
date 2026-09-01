import { useState } from 'react';
import { Share, X } from 'lucide-react';
import { readDismissed, shouldOfferInstallHint, writeDismissed } from '@/lib/installHint';

/**
 * A quiet note, shown only in Safari on iOS and only while Cadence is not
 * already on the home screen. Everywhere else the browser offers installation
 * itself, so this would be clutter.
 *
 * The share glyph sits inside the sentence rather than in a bordered tile:
 * a tile here looks exactly like every other icon button in the app, and the
 * button being described belongs to Safari, not to this page. It also says
 * where that button is, because reaching this note means scrolling down, and
 * scrolling down is what hides Safari's toolbar.
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
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium text-ink">Keep Cadence on your home screen</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          In Safari&rsquo;s toolbar, tap
          <span className="mx-1 inline-flex translate-y-0.5 items-center gap-1 text-ink">
            <Share size={13} strokeWidth={1.75} aria-hidden />
            <span className="font-medium">Share</span>
          </span>
          &mdash; scroll up if the toolbar is hidden &mdash; then choose{' '}
          <strong className="font-medium text-ink">Add to Home Screen</strong>.
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-faint">
          Cadence then opens in one tap, and your history is no longer cleared when Safari tidies
          up storage after a week away.
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
