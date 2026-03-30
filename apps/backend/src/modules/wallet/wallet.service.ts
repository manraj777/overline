import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { WalletTransactionType, Prisma, Wallet } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Free cash configuration
export const FREE_CASH_CONFIG = {
  MIN_AMOUNT: 25, // Minimum free cash (INR)
  MAX_AMOUNT: 30, // Maximum free cash (INR)
  GRACE_PERIOD_MINUTES: 60, // Minutes before booking for full refund
};

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get or create wallet for a user (internal use)
   */
  private async getOrCreateWalletInternal(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: {
          userId,
          balance: new Decimal(0),
          freeCashBalance: new Decimal(0),
          lockedAmount: new Decimal(0),
        },
        include: {
          transactions: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      this.logger.log(`Created new wallet for user ${userId}`);
    }

    return wallet;
  }

  /**
   * Get or create wallet for a user (public API - mobile-compatible format)
   */
  async getOrCreateWallet(userId: string) {
    const wallet = await this.getOrCreateWalletInternal(userId);

    // Transform to mobile-app compatible format
    return {
      id: wallet.id,
      balance: wallet.freeCashBalance.toNumber(), // Free cash is the main balance shown to users
      totalEarned: wallet.totalEarned.toNumber(),
      totalSpent: wallet.totalSpent.toNumber(),
      freeCashBalance: wallet.freeCashBalance.toNumber(),
      lockedAmount: wallet.lockedAmount.toNumber(),
      transactions: wallet.transactions.map((t) => ({
        id: t.id,
        type: this.mapTransactionType(t.type),
        amount: t.amount.toNumber(),
        description: t.description || this.getTransactionDescription(t.type),
        createdAt: t.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Map internal transaction types to mobile-friendly types
   */
  private mapTransactionType(type: WalletTransactionType): string {
    const mapping: Record<WalletTransactionType, string> = {
      FREE_CASH_CREDIT: 'EARNED',
      FREE_CASH_DEBIT: 'SPENT',
      FREE_CASH_RETURN: 'EARNED',
      REFUND: 'EARNED',
      REWARD: 'EARNED',
      ADMIN_CREDIT: 'EARNED',
      ADMIN_DEBIT: 'SPENT',
    };
    return mapping[type] || 'EARNED';
  }

  /**
   * Get default description for transaction type
   */
  private getTransactionDescription(type: WalletTransactionType): string {
    const descriptions: Record<WalletTransactionType, string> = {
      FREE_CASH_CREDIT: 'Free cash earned',
      FREE_CASH_DEBIT: 'Free cash used',
      FREE_CASH_RETURN: 'Free cash returned',
      REFUND: 'Refund credited',
      REWARD: 'Reward earned',
      ADMIN_CREDIT: 'Credit from admin',
      ADMIN_DEBIT: 'Debit by admin',
    };
    return descriptions[type] || 'Transaction';
  }

  /**
   * Get wallet balance for a user
   */
  async getWalletBalance(userId: string) {
    const wallet = await this.getOrCreateWalletInternal(userId);
    return {
      balance: wallet.balance.toNumber(),
      freeCashBalance: wallet.freeCashBalance.toNumber(),
      lockedAmount: wallet.lockedAmount.toNumber(),
      totalAvailable:
        wallet.balance.toNumber() +
        wallet.freeCashBalance.toNumber() -
        wallet.lockedAmount.toNumber(),
      totalEarned: wallet.totalEarned.toNumber(),
      totalSpent: wallet.totalSpent.toNumber(),
    };
  }

  /**
   * Calculate free cash amount for a booking (randomized between MIN and MAX)
   */
  calculateFreeCashAmount(): number {
    const { MIN_AMOUNT, MAX_AMOUNT } = FREE_CASH_CONFIG;
    return Math.floor(Math.random() * (MAX_AMOUNT - MIN_AMOUNT + 1)) + MIN_AMOUNT;
  }

  /**
   * Credit free cash to user's wallet (when they complete a service)
   */
  async creditFreeCash(userId: string, amount: number, bookingId: string, description?: string) {
    const wallet = await this.getOrCreateWalletInternal(userId);
    const previousBalance = wallet.freeCashBalance;
    const newBalance = new Decimal(previousBalance.toNumber() + amount);

    const [updatedWallet, transaction] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          freeCashBalance: newBalance,
          totalEarned: { increment: amount },
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          bookingId,
          type: WalletTransactionType.FREE_CASH_CREDIT,
          amount: new Decimal(amount),
          previousBalance,
          newBalance,
          description: description || `Free cash credited for booking completion`,
        },
      }),
    ]);

    this.logger.log(`Credited ₹${amount} free cash to user ${userId} for booking ${bookingId}`);
    return { wallet: updatedWallet, transaction };
  }

  /**
   * Debit free cash from wallet (when booking is made)
   */
  async debitFreeCash(userId: string, amount: number, bookingId: string, description?: string) {
    const wallet = await this.getOrCreateWalletInternal(userId);

    if (wallet.freeCashBalance.toNumber() < amount) {
      throw new BadRequestException('Insufficient free cash balance');
    }

    const previousBalance = wallet.freeCashBalance;
    const newBalance = new Decimal(previousBalance.toNumber() - amount);

    const [updatedWallet, transaction] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          freeCashBalance: newBalance,
          totalSpent: { increment: amount },
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          bookingId,
          type: WalletTransactionType.FREE_CASH_DEBIT,
          amount: new Decimal(amount),
          previousBalance,
          newBalance,
          description: description || `Free cash used for booking`,
        },
      }),
    ]);

    this.logger.log(`Debited ₹${amount} free cash from user ${userId} for booking ${bookingId}`);
    return { wallet: updatedWallet, transaction };
  }

  /**
   * Return free cash on valid cancellation
   */
  async returnFreeCash(
    userId: string,
    amount: number,
    bookingId: string,
    isValidReason: boolean,
    description?: string,
  ) {
    if (!isValidReason) {
      this.logger.warn(`Free cash return denied for booking ${bookingId} - invalid reason/spammer`);
      return null;
    }

    const wallet = await this.getOrCreateWalletInternal(userId);
    const previousBalance = wallet.freeCashBalance;
    const newBalance = new Decimal(previousBalance.toNumber() + amount);

    const [updatedWallet, transaction] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          freeCashBalance: newBalance,
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          bookingId,
          type: WalletTransactionType.FREE_CASH_RETURN,
          amount: new Decimal(amount),
          previousBalance,
          newBalance,
          description: description || `Free cash returned after valid cancellation`,
        },
      }),
    ]);

    this.logger.log(`Returned ₹${amount} free cash to user ${userId} for booking ${bookingId}`);
    return { wallet: updatedWallet, transaction };
  }

  /**
   * Process refund for prepaid bookings
   */
  async processRefund(userId: string, amount: number, bookingId: string, description?: string) {
    const wallet = await this.getOrCreateWalletInternal(userId);
    const previousBalance = wallet.balance;
    const newBalance = new Decimal(previousBalance.toNumber() + amount);

    const [updatedWallet, transaction] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: newBalance,
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          bookingId,
          type: WalletTransactionType.REFUND,
          amount: new Decimal(amount),
          previousBalance,
          newBalance,
          description: description || `Refund for cancelled prepaid booking`,
        },
      }),
    ]);

    this.logger.log(`Refunded ₹${amount} to user ${userId} for booking ${bookingId}`);
    return { wallet: updatedWallet, transaction };
  }

  /**
   * Credit reward for completing a service
   */
  async creditReward(userId: string, amount: number, bookingId: string, description?: string) {
    const wallet = await this.getOrCreateWalletInternal(userId);
    const previousBalance = wallet.freeCashBalance;
    const newBalance = new Decimal(previousBalance.toNumber() + amount);

    const [updatedWallet, transaction] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          freeCashBalance: newBalance,
          totalEarned: { increment: amount },
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          bookingId,
          type: WalletTransactionType.REWARD,
          amount: new Decimal(amount),
          previousBalance,
          newBalance,
          description: description || `Reward for completing service`,
        },
      }),
    ]);

    this.logger.log(`Credited ₹${amount} reward to user ${userId}`);
    return { wallet: updatedWallet, transaction };
  }

  /**
   * Get wallet transactions for a user
   */
  async getTransactions(
    userId: string,
    options: {
      take?: number;
      skip?: number;
      type?: WalletTransactionType;
    } = {},
  ) {
    const wallet = await this.getOrCreateWalletInternal(userId);
    const { take = 20, skip = 0, type } = options;

    const where: Prisma.WalletTransactionWhereInput = {
      walletId: wallet.id,
      ...(type && { type }),
    };

    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);

    return { transactions, total, wallet };
  }

  /**
   * Check if user is a spammer based on cancellation patterns
   */
  async isUserSpammer(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalBookings: true,
        cancelledBookings: true,
        noShowBookings: true,
        trustScore: true,
      },
    });

    if (!user) return false;

    // Consider spam if:
    // - Trust score below 50
    // - Cancellation rate > 50% with at least 3 bookings
    // - No-show rate > 30%
    const cancellationRate =
      user.totalBookings > 0 ? (user.cancelledBookings / user.totalBookings) * 100 : 0;
    const noShowRate =
      user.totalBookings > 0 ? (user.noShowBookings / user.totalBookings) * 100 : 0;

    return (
      user.trustScore < 50 || (cancellationRate > 50 && user.totalBookings >= 3) || noShowRate > 30
    );
  }

  /**
   * Validate cancellation reason (simple validation, can be expanded)
   */
  isValidCancellationReason(reason: string): boolean {
    const validReasons = [
      'SHOP_CLOSED',
      'EMERGENCY',
      'WRONG_BOOKING',
      'PRICE_ISSUE',
      'SCHEDULE_CONFLICT',
    ];
    // FOUND_BETTER and OTHER are considered less valid for full refund
    return validReasons.includes(reason);
  }
}
