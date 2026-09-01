import { BarChart3, CalendarDays, Home, ListChecks, Settings, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Hidden from the phone bar, reachable from the header. */
  secondary?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Today', icon: Home },
  { to: '/habits', label: 'Habits', icon: ListChecks },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/insights', label: 'Insights', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings, secondary: true },
];
