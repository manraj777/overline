import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService firebasePhoneLogin', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
    },
    shop: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('access-token'),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'google.clientId') return 'google-client-id';
      if (key === 'jwt.refreshExpiration') return '7d';
      if (key === 'jwt.accessExpiration') return '15m';
      return undefined;
    }),
  };

  const mockRedis = {};
  const mockFraudDetection = {};
  const mockGooglePlaces = {};

  const buildUser = (overrides: Record<string, unknown> = {}) => ({
    id: 'user-1',
    email: 'user@overline.in',
    name: 'Test User',
    phone: '+919876543210',
    role: 'USER',
    tenantId: null,
    isEmailVerified: false,
    isPhoneVerified: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    authProvider: 'local',
    hashedPassword: null,
    ...overrides,
  });

  let service: AuthService;
  let verifyIdToken: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new AuthService(
      mockPrisma as any,
      mockJwtService as any,
      mockConfigService as any,
      mockRedis as any,
      mockFraudDetection as any,
      mockGooglePlaces as any,
    );

    verifyIdToken = jest.fn();
    (service as any).firebaseAuth = { verifyIdToken };

    mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
  });

  it('logs in an existing phone user and issues backend tokens', async () => {
    const existing = buildUser({ authProvider: 'google', hashedPassword: null });
    const updated = buildUser({ authProvider: 'firebase' });

    verifyIdToken.mockResolvedValue({ phone_number: '+919876543210', name: 'Existing User' });
    mockPrisma.user.findUnique.mockResolvedValue(existing);
    mockPrisma.user.update.mockResolvedValue(updated);

    const result = await service.firebasePhoneLogin('firebase-id-token');

    expect(verifyIdToken).toHaveBeenCalledWith('firebase-id-token', true);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { phone: '+919876543210' },
    });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: expect.objectContaining({
        isPhoneVerified: true,
        authProvider: 'firebase',
      }),
    });
    expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: updated.id,
        }),
      }),
    );
    expect(result.accessToken).toBe('access-token');
    expect(result.user.id).toBe(updated.id);
    expect(result.user.phone).toBe('+919876543210');
  });

  it('auto-creates a user when phone does not exist', async () => {
    verifyIdToken.mockResolvedValue({ phone_number: '9876543210', name: 'New User' });
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue(
      buildUser({ id: 'user-2', phone: '+919876543210', authProvider: 'firebase' }),
    );

    const result = await service.firebasePhoneLogin('firebase-id-token');

    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        phone: '+919876543210',
        authProvider: 'firebase',
        name: 'New User',
        role: 'USER',
        email: expect.stringMatching(/^919876543210\.[0-9]+@phone\.overline\.in$/),
      }),
    });
    expect(result.user.id).toBe('user-2');
  });

  it('rejects expired Firebase ID tokens', async () => {
    verifyIdToken.mockRejectedValue({ code: 'auth/id-token-expired' });

    await expect(service.firebasePhoneLogin('expired-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects invalid Firebase ID tokens', async () => {
    verifyIdToken.mockRejectedValue({ code: 'auth/invalid-id-token' });

    await expect(service.firebasePhoneLogin('invalid-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects Firebase tokens without phone claims', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'abc-123' });

    await expect(service.firebasePhoneLogin('token-without-phone')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});