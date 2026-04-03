import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';
import {useQueueRealtime} from '../useQueueRealtime';

const mockSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
};

const mockIo = jest.fn(() => mockSocket);

jest.mock('socket.io-client', () => {
  const mockModule: any = {io: mockIo};
  mockModule.default = mockModule;
  return mockModule;
});

jest.mock('../../api/client', () => ({
  __esModule: true,
  default: {
    defaults: {
      baseURL: 'http://localhost:3001/api/v1',
    },
  },
}));

type HookState = {
  connected: boolean;
  lastUpdatedAt: number | null;
};

function HookHarness({shopId, onState}: {shopId: string; onState: (state: HookState) => void}) {
  const state = useQueueRealtime({
    shopId,
    onQueueUpdate: () => undefined,
  });

  React.useEffect(() => {
    onState(state);
  }, [state, onState]);

  return null;
}

describe('useQueueRealtime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('connects to queue namespace, joins room, and reacts to queueUpdate', async () => {
    const listeners: Record<string, (payload?: any) => void> = {};
    mockSocket.on.mockImplementation((event: string, cb: (payload?: any) => void) => {
      listeners[event] = cb;
      return mockSocket;
    });

    const states: HookState[] = [];

    await act(async () => {
      ReactTestRenderer.create(
        <HookHarness
          shopId="shop-1"
          onState={state => {
            states.push(state);
          }}
        />,
      );
    });

    expect(mockIo).toHaveBeenCalledWith('http://localhost:3001/queue', expect.any(Object));

    await act(async () => {
      listeners.connect?.();
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('joinShopQueue', {shopId: 'shop-1'});
    expect(states[states.length - 1]?.connected).toBe(true);

    await act(async () => {
      listeners.queueUpdate?.({shopId: 'shop-1'});
    });

    expect(states[states.length - 1]?.lastUpdatedAt).not.toBeNull();

    await act(async () => {
      listeners.disconnect?.();
    });

    expect(states[states.length - 1]?.connected).toBe(false);
  });
});
