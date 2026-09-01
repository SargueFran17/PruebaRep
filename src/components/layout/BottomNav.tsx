import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '@/app/navigation';
import { cn } from '@/lib/cn';

export function BottomNav() {
  const items = NAV_ITEMS.filter((item) => !item.secondary);

  return (
    <nav
      aria-label="Main"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pt-1 backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-[10.5px] font-medium transition-colors duration-150',
                    isActive ? 'text-accent-text' : 'text-faint',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'grid h-7 w-11 place-items-center rounded-full transition-colors duration-200',
                        isActive && 'bg-accent-tint',
                      )}
                    >
                      <Icon size={18} strokeWidth={isActive ? 2 : 1.75} aria-hidden />
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
