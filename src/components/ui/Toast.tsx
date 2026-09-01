import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Trophy } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/store/useAppStore';

/** One transient message at a time — enough for an app this size, and quiet. */
export function ToastLayer() {
  const notice = useAppStore((state) => state.notice);
  const dismiss = useAppStore((state) => state.dismissNotice);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(dismiss, 3200);
    return () => window.clearTimeout(timer);
  }, [notice, dismiss]);

  if (!notice) return null;

  return createPortal(
    <div
      // Anchored to the top: the bottom is occupied by the phone nav bar and by
      // dialog footers, and a toast must never sit on a button.
      className="pointer-events-none fixed inset-x-0 top-16 z-60 flex justify-center px-4 lg:top-6"
      role="status"
      aria-live="polite"
    >
      <div
        key={notice.id}
        className={cn(
          'animate-fade-up pointer-events-auto flex items-center gap-2.5 rounded-full border px-4 py-2.5 text-[13px] font-medium shadow-raised',
          notice.tone === 'gold'
            ? 'border-gold-line bg-gold-tint text-gold-text'
            : 'border-line bg-surface text-ink',
        )}
      >
        {notice.tone === 'gold' ? (
          <Trophy size={15} strokeWidth={1.75} aria-hidden />
        ) : (
          <Check size={15} strokeWidth={2} aria-hidden />
        )}
        {notice.message}
      </div>
    </div>,
    document.body,
  );
}
