export interface ActiveQueueSession {
  shopId: string;
  bookingId: string;
  tokenCode: string;
}

const QUEUE_SESSION_PREFIX = 'queue-session:';

export function queueSessionKey(shopId: string): string {
  return `${QUEUE_SESSION_PREFIX}${shopId}`;
}

export function getQueueSession(shopId: string): ActiveQueueSession | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(queueSessionKey(shopId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ActiveQueueSession;
    if (!parsed.bookingId || !parsed.tokenCode || !parsed.shopId) {
      window.localStorage.removeItem(queueSessionKey(shopId));
      return null;
    }
    return parsed;
  } catch {
    window.localStorage.removeItem(queueSessionKey(shopId));
    return null;
  }
}

export function getAllQueueSessions(): ActiveQueueSession[] {
  if (typeof window === 'undefined') return [];
  const sessions: ActiveQueueSession[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith(QUEUE_SESSION_PREFIX)) continue;
    const shopId = key.slice(QUEUE_SESSION_PREFIX.length);
    const session = getQueueSession(shopId);
    if (session) sessions.push(session);
  }

  return sessions;
}

export function saveQueueSession(session: ActiveQueueSession): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(queueSessionKey(session.shopId), JSON.stringify(session));
}

export function removeQueueSession(shopId: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(queueSessionKey(shopId));
}