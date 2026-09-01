import clsx from 'clsx';
import type { ClassValue } from 'clsx';

/** Class name helper. Tailwind v4 handles cascade order, so no merge needed. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
