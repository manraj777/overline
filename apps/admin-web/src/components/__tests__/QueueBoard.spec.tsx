import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ToastProvider } from '@/components/ui';

const useQueueTrackingMock: any = jest.fn();
const useQueueCallNextMock: any = jest.fn();
const useQueueCheckInMock: any = jest.fn();
const useQueueStartServiceMock: any = jest.fn();
const useQueueMarkDoneMock: any = jest.fn();
const useQueueRemoveMock: any = jest.fn();
const useQueueSocketMock: any = jest.fn();
const useAuthStoreMock: any = jest.fn();

jest.mock('@/hooks', () => ({
  useQueueTracking: () => useQueueTrackingMock(),
  useQueueCallNext: () => useQueueCallNextMock(),
  useQueueCheckIn: () => useQueueCheckInMock(),
  useQueueStartService: () => useQueueStartServiceMock(),
  useQueueMarkDone: () => useQueueMarkDoneMock(),
  useQueueRemove: () => useQueueRemoveMock(),
  useQueueSocket: () => useQueueSocketMock(),
}));

jest.mock('@/stores/auth', () => ({
  useAuthStore: () => useAuthStoreMock(),
}));

const QueueBoard = require('@/components/QueueBoard').default;

describe('QueueBoard', () => {
  const mutationStub: any = {
    mutateAsync: async () => undefined,
    isPending: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useAuthStoreMock.mockReturnValue({ shopId: 'shop-1' });

    useQueueTrackingMock.mockReturnValue({
      isLoading: false,
      data: [
        {
          id: 'booking-1',
          bookingNumber: 'OL-0001',
          status: 'CONFIRMED',
          queuePosition: 1,
          customerName: 'Aarav Sharma',
          customerPhone: '9876543210',
          createdAt: new Date().toISOString(),
          startTime: new Date().toISOString(),
          services: [{ serviceName: 'Haircut' }],
          user: null,
        },
        {
          id: 'booking-2',
          bookingNumber: 'OL-0002',
          status: 'IN_PROGRESS',
          queuePosition: 2,
          customerName: 'Neha Jain',
          customerPhone: '9988776655',
          createdAt: new Date().toISOString(),
          startTime: new Date().toISOString(),
          services: [{ serviceName: 'Facial' }],
          user: null,
        },
      ],
    });

    useQueueCallNextMock.mockReturnValue(mutationStub);
    useQueueCheckInMock.mockReturnValue(mutationStub);
    useQueueStartServiceMock.mockReturnValue(mutationStub);
    useQueueMarkDoneMock.mockReturnValue(mutationStub);
    useQueueRemoveMock.mockReturnValue(mutationStub);
  });

  const renderBoard = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <QueueBoard />
        </ToastProvider>
      </QueryClientProvider>
    );
  };

  it('renders explicit status labels and approaching chip style', () => {
    renderBoard();

    const approachingChip = screen.getByText('Approaching');
    const inServiceChip = screen.getByText('In Service');

    expect(approachingChip).toBeTruthy();
    expect(inServiceChip).toBeTruthy();
    expect(approachingChip.className).toContain('text-amber-200');
  });

  it('renders clearer action labels', () => {
    renderBoard();

    expect(screen.getByRole('button', { name: 'Call Next (Approaching)' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Verify Token & Start' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Mark Service Done' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Remove From Queue' }).length).toBeGreaterThan(0);
  });

  it('opens verification modal from the start action', () => {
    renderBoard();

    fireEvent.click(screen.getAllByRole('button', { name: 'Verify Token & Start' })[0]);

    expect(screen.getByText('Verify Token')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Verify & Start Service' })).toBeTruthy();
  });
});
