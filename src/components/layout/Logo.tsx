export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-[10px] bg-accent text-accent-contrast"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden>
          <path
            d="M5 12.5 L10 17.5 L19 6.5"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {!compact ? (
        <span className="display text-[19px] tracking-tight text-ink">Cadence</span>
      ) : null}
    </div>
  );
}
