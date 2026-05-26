import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isToday, isTomorrow, addMinutes } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (isToday(d)) return `Today, ${format(d, 'MMM d')}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, 'MMM d')}`;
  return format(d, 'EEE, MMM d');
}

export function formatTime(time: string | Date): string {
  if (!time) return '';
  if (typeof time !== 'string' || time.includes('T') || time.includes('-')) {
    const d = typeof time === 'string' ? parseISO(time) : time;
    return format(d, 'h:mm a');
  }
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return format(date, 'h:mm a');
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}min` : `${hours}h`;
}

export function formatPrice(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getEndTime(startTime: string | Date, durationMinutes: number): string {
  let startDate = new Date();
  if (typeof startTime !== 'string' || startTime.includes('T') || startTime.includes('-')) {
    startDate = typeof startTime === 'string' ? parseISO(startTime) : startTime;
  } else {
    const [hours, minutes] = startTime.split(':').map(Number);
    startDate.setHours(hours, minutes, 0, 0);
  }
  const endDate = addMinutes(startDate, durationMinutes);
  return format(endDate, 'HH:mm');
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function generateAvatar(name: string): string {
  const colors = [
    'bg-primary-500',
    'bg-accent-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function getShopTodayHours(shop: any, now: Date = new Date()) {
  if (!shop || !shop.workingHours) return null;
  const timezone = shop.timezone || 'Asia/Kolkata';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === 'weekday')?.value;
  if (!weekday) return null;
  return shop.workingHours.find((entry: any) => entry.dayOfWeek === weekday.toUpperCase()) || null;
}

export function isShopOpenNow(shop: any, now: Date = new Date()): boolean {
  if (!shop || !shop.isActive) return false;

  const todaysHours = shop.workingHours;
  if (!todaysHours || todaysHours.length === 0) {
    return true;
  }

  const timezone = shop.timezone || 'Asia/Kolkata';
  
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now);

  const weekday = parts.find((part) => part.type === 'weekday')?.value;
  let hour = Number(parts.find((part) => part.type === 'hour')?.value || '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || '0');
  const dayPeriod = parts.find((part) => part.type === 'dayPeriod')?.value;

  if (dayPeriod) {
    const isPM = dayPeriod.toLowerCase().includes('pm');
    const isAM = dayPeriod.toLowerCase().includes('am');
    if (isPM && hour < 12) hour += 12;
    if (isAM && hour === 12) hour = 0;
  }
  
  if (hour === 24) hour = 0;

  const currentMinutes = hour * 60 + minute;

  if (!weekday) return true;

  const today = todaysHours.find((entry: any) => entry.dayOfWeek === weekday.toUpperCase());
  if (!today || today.isClosed) {
    return false;
  }

  const parseTime = (val: string) => {
    if (!val) return 0;
    const isPM = val.toLowerCase().includes('pm');
    const isAM = val.toLowerCase().includes('am');
    const str = val.replace(/[^0-9:]/g, '');
    const [hStr, mStr] = str.split(':');
    let h = Number(hStr);
    const m = Number(mStr);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    return h * 60 + m;
  };

  const openMinutes = parseTime(today.openTime);
  const closeMinutes = parseTime(today.closeTime);

  if (closeMinutes === openMinutes) return true;
  
  if (closeMinutes > openMinutes) {
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }
  
  return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
}
