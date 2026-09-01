import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { MobileTopBar } from './MobileTopBar';
import { Sidebar } from './Sidebar';

export function AppShell() {
  return (
    <div className="min-h-dvh bg-canvas">
      <a
        href="#main"
        className="sr-only rounded-md bg-accent px-4 py-2 text-accent-contrast focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-100"
      >
        Skip to content
      </a>

      <Sidebar />
      <MobileTopBar />

      <div className="lg:pl-60">
        <main
          id="main"
          className="mx-auto w-full max-w-5xl px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16"
        >
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
