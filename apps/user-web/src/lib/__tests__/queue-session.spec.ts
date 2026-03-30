import {
  getAllQueueSessions,
  getQueueSession,
  queueSessionKey,
  removeQueueSession,
  saveQueueSession,
} from '@/lib/queue-session';
import { beforeEach, describe, expect, it } from '@jest/globals';

describe('queue-session', () => {
  const session = {
    shopId: 'shop-1',
    bookingId: 'booking-1',
    tokenCode: 'OL-1234',
  };

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves and reads a queue session by shop', () => {
    saveQueueSession(session);

    expect(window.localStorage.getItem(queueSessionKey('shop-1'))).toBe(JSON.stringify(session));
    expect(getQueueSession('shop-1')).toEqual(session);
  });

  it('returns null and removes corrupted session payload', () => {
    window.localStorage.setItem(queueSessionKey('shop-bad'), '{not-json');

    expect(getQueueSession('shop-bad')).toBeNull();
    expect(window.localStorage.getItem(queueSessionKey('shop-bad'))).toBeNull();
  });

  it('returns null and removes incomplete session payload', () => {
    window.localStorage.setItem(queueSessionKey('shop-bad'), JSON.stringify({ shopId: 'shop-bad' }));

    expect(getQueueSession('shop-bad')).toBeNull();
    expect(window.localStorage.getItem(queueSessionKey('shop-bad'))).toBeNull();
  });

  it('returns all valid queue sessions and ignores unrelated storage keys', () => {
    saveQueueSession(session);
    saveQueueSession({
      shopId: 'shop-2',
      bookingId: 'booking-2',
      tokenCode: 'OL-9999',
    });
    window.localStorage.setItem('other-key', 'value');

    const all = getAllQueueSessions();

    expect(all).toHaveLength(2);
    expect(all).toContainEqual(session);
    expect(all).toContainEqual({
      shopId: 'shop-2',
      bookingId: 'booking-2',
      tokenCode: 'OL-9999',
    });
  });

  it('removes a queue session cleanly', () => {
    saveQueueSession(session);

    removeQueueSession('shop-1');

    expect(getQueueSession('shop-1')).toBeNull();
  });
});
