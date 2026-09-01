# Cadence

A habit tracker built to be opened every morning: mark what you did, see how the
week is going, and get an honest read on your consistency.

Greyscale interface, navy for intent, gold reserved for genuine achievement.

```bash
npm install
npm run dev      # http://localhost:5173
npm run verify   # lint + typecheck + tests + production build
```

There is no account and no sign-up. Open **Settings → Load demo data** to fill
the app with several months of realistic history and try every screen at once.

## What it does

| Screen       | Answers                                                      |
| ------------ | ------------------------------------------------------------ |
| **Today**    | What is left today, what is done, how the week is going       |
| **Habits**   | Create, edit, archive, delete, reorder; per-habit record      |
| **Calendar** | Month and week history; swipe or drag sideways to move through |
| **Goals**    | Weekly and monthly targets with progress, pace and status     |
| **Insights** | Completion rates, trends, per-habit breakdown, milestones     |
| **Settings** | Theme, start of week, categories, export / import / delete    |

Cadence installs to a phone's home screen and runs offline: the whole app is
403 KB, so it is precached in full and there is nothing to wait for.

Habits can be a simple check or a measured amount (30 min, 2 L, 20 pages), and
run daily, on named weekdays, *N* times per week, or *N* times per month.

## Architecture

```
src/
  domain/        Pure business logic. No React, no storage, no I/O.
  persistence/   Storage adapters, schema validation, migrations, demo data.
  store/         Zustand store (raw records) + selectors (derived numbers).
  components/    ui/ primitives, then feature components.
  pages/         One file per route.
  hooks/  lib/   Cross-cutting hooks and formatting helpers.
```

The dependency arrow only ever points inward: `pages → components → store →
domain`. `domain/` imports nothing from the layers above it, which is what makes
the streak, goal and statistics rules testable without rendering anything.

**Stack.** React 19 + TypeScript, Vite, Tailwind CSS v4, Zustand, Vitest and
Testing Library. Six runtime dependencies in total.

Two things are deliberately hand-written rather than installed. Charts are SVG
and CSS: there are three of them, they have to match the palette exactly, and a
charting library would have been the largest dependency here. Dates are the
module in `domain/dates.ts`: the app needs perhaps a dozen operations on local
calendar days, and owning them is what let the DST and midnight-rollover
behaviour be pinned down by tests rather than trusted.

### Decisions worth knowing

**Days are strings, not timestamps.** A day is a `DateKey` — a local `YYYY-MM-DD`
calendar day. A habit belongs to the day you lived, not to a UTC instant, so day
identity has to survive timezones and DST. All arithmetic goes through
`domain/dates.ts`, which builds dates with `new Date(y, m, d)` rather than
parsing ISO strings (`new Date('2025-03-30')` is UTC midnight and silently
shifts a day for anyone west of Greenwich).

**Streaks are measured in the habit's own cadence.** A Mon/Wed/Fri habit is not
broken by an idle Tuesday; a "4× per week" habit counts consecutive *satisfied
weeks*, not days. The open day or period never breaks a streak — it can only
extend it — so the number does not drop to zero every morning before you have
had a chance to act.

**Quotas are pro-rated by lifetime, never by elapsed time.** A habit created on
a Friday is judged against a smaller first week. But the week *in progress*
keeps its full quota, or hitting your pace on Monday would already count as a
finished week. Completion rates use the elapsed figure, streaks use the full one.

**Persistence is one interface.** Everything above `StorageAdapter` is
storage-agnostic; `LocalStorageAdapter` is the only implementation that touches
the browser. Moving to a backend means writing one more adapter, not touching a
component. Payloads are versioned, migrated on read, and validated defensively —
a single malformed record from an imported file is dropped, not thrown.

**Offline is the normal case, not a fallback.** The app makes no network
requests at runtime, so a service worker precaching the entire bundle is enough
for it to work fully offline — creating habits, ticking them off, every
statistic. Only the fonts come from elsewhere, and they are cached on first
load. On iOS this matters twice over: Safari clears script storage after seven
days away, and home-screen apps are exempt, so installing is what protects the
history.

**Milestones are derived, never stored.** Recomputing them keeps them honest
after an edit, an import, or a deleted habit.

**The calendar opens two months ahead.** Far enough to see what a new habit
commits you to, close enough that history stays the point of the screen. Future
days are always read-only, and a month that has not happened says "Still to
come" rather than reporting 0 %.

## Testing

180 tests, covering the logic that is easy to get quietly wrong:

- **Dates** — month and year boundaries, leap days, DST, week starts, clamping
  (31 Jan + 1 month is 28 Feb, not 3 Mar), and the midnight rollover: an app
  left open overnight must move to the new day before the next tap is recorded.
- **Streaks** — daily, named-weekday and quota habits; unscheduled gaps, missed
  days, the open period, archived habits, month/year/leap-day crossings.
- **Goals** — progress, pacing, achieved and partially achieved states, deleted
  habits, weeks that span two months.
- **Statistics** — rates, perfect days, best streaks, future days excluded.
- **Persistence** — round-trips, migrations, and malformed input.
- **The app itself** — creating, completing and undoing habits, validation,
  navigation, the two-month forward limit, and settings, driven through the
  real UI.

The UI was also checked in a real browser at 320 / 390 / 834 / 1440 px in both
themes: no console errors, no horizontal overflow, focus trapped in dialogs,
Escape closes them, focus returns to the trigger, and completions survive a
reload. Every figure the Insights screen displays was cross-checked against an
independent recomputation from the raw stored data, so the wiring is verified
and not just the pure functions.

## Accessibility

Semantic landmarks and a skip link; every control labelled; dialogs are proper
focus-trapped `role="dialog"`s; progress bars expose their values; state is
never carried by colour alone (checks, counts and text back it up); visible
focus rings throughout; `prefers-reduced-motion` is honoured and can also be
forced on in Settings.

Form fields are 16 px on phones. Below that, iOS Safari zooms the page in on
focus and the user has to scroll sideways to reach the next control.

Touch targets are at least 32 px on phones. Where a control is drawn smaller
than that for visual balance, a `touch-target` utility grows its hit area to
44 px on coarse pointers only — never where it would overlap a neighbour, which
is why controls sitting side by side (a goal's edit and delete) were made
genuinely larger instead.

## Notes

Data lives in this browser's `localStorage` and never leaves the device. Export
from Settings before clearing site data. Reminder times are recorded on a habit
but no notifications are sent — the app does not ask for a permission it would
not use.
