import { Link, useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { Logo } from './Logo';

export function MobileTopBar() {
  const { pathname } = useLocation();
  const onSettings = pathname === '/settings';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur-md lg:hidden">
      <Link to="/" aria-label="Cadence home" className="rounded-md">
        <Logo />
      </Link>
      <Link
        to="/settings"
        aria-label="Settings"
        aria-current={onSettings ? 'page' : undefined}
        className="grid h-9 w-9 place-items-center rounded-md text-muted transition-colors hover:bg-sunken hover:text-ink aria-[current=page]:bg-accent-tint aria-[current=page]:text-accent-text"
      >
        <Settings size={18} strokeWidth={1.75} aria-hidden />
      </Link>
    </header>
  );
}
