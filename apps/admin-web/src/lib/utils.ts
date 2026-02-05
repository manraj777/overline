import { type ClassValue, clsx } from 'clsx';
import { format, parseISO, isToday, isTomorrow, isYesterday, startOfDay, endOfDay } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d, yyyy');
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy h:mm a');
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return format(date, 'h:mm a');
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

export function formatPrice(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getDateRange(range: string): { start: Date; end: Date } {
  const today = new Date();
  const end = endOfDay(today);

  switch (range) {
    case 'today':
      return { start: startOfDay(today), end };
    case 'week': {
      const start = new Date(today);
      start.setDate(today.getDate() - 7);
      return { start: startOfDay(start), end };
    }
    case 'month': {
      const start = new Date(today);
      start.setMonth(today.getMonth() - 1);
      return { start: startOfDay(start), end };
    }
    case 'year': {
      const start = new Date(today);
      start.setFullYear(today.getFullYear() - 1);
      return { start: startOfDay(start), end };
    }
    default:
      return { start: startOfDay(today), end };
  }
}
