import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '@/app/navigation';
import { cn } from '@/lib/cn';
import { Logo } from './Logo';

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-surface lg:flex">
      <div className="px-6 pt-7 pb-6">
        <Logo />
      </div>

      <nav aria-label="Main" className="flex-1 px-3">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.filter((item) => !item.secondary).map((item) => (
            <li key={item.to}>
              <SidebarLink item={item} />
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-line px-3 py-3">
        <ul>
          {NAV_ITEMS.filter((item) => item.secondary).map((item) => (
            <li key={item.to}>
              <SidebarLink item={item} />
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function SidebarLink({ item }: { item: (typeof NAV_ITEMS)[number] }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
          isActive ? 'bg-accent-tint text-accent-text' : 'text-muted hover:bg-sunken hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            aria-hidden
            className={cn(
              'absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent transition-opacity duration-150',
              isActive ? 'opacity-100' : 'opacity-0',
            )}
          />
          <Icon size={17} strokeWidth={1.75} aria-hidden />
          {item.label}
        </>
      )}
    </NavLink>
  );
}
