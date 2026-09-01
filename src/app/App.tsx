import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ToastLayer } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { DashboardPage } from '@/pages/DashboardPage';
import { HabitsPage } from '@/pages/HabitsPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { GoalsPage } from '@/pages/GoalsPage';
import { InsightsPage } from '@/pages/InsightsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { useAppStore } from '@/store/useAppStore';

export function App() {
  const status = useAppStore((state) => state.status);
  const hydrate = useAppStore((state) => state.hydrate);
  const settings = useAppStore((state) => state.data.settings);

  useTheme(settings.theme, settings.reduceMotion);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (status === 'loading') return <SplashScreen />;

  return (
    <>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="habits" element={<HabitsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <ToastLayer />
    </>
  );
}

function SplashScreen() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas" role="status" aria-live="polite">
      <span className="sr-only">Loading Cadence</span>
      <span
        aria-hidden
        className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-accent"
      />
    </div>
  );
}
