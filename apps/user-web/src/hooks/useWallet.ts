import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Wallet Types (matching backend response)
// ============================================================================

export interface WalletTransaction {
  id: string;
  type: string; // Mapped from WalletTransactionType
  amount: number;
  description: string;
  createdAt: string;
}

export interface WalletData {
  id: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  freeCashBalance: number;
  lockedAmount: number;
  transactions: WalletTransaction[];
}

export interface WalletBalance {
  balance: number;
  freeCashBalance: number;
  lockedAmount: number;
  totalAvailable: number;
  totalEarned: number;
  totalSpent: number;
}

export interface WalletTransactionsResponse {
  transactions: WalletTransaction[];
  total: number;
  wallet: any;
}

// ============================================================================
// Hooks
// ============================================================================

export function useWallet() {
  return useQuery<WalletData>({
    queryKey: ['wallet'],
    queryFn: async () => {
      const { data } = await api.get('/wallet');
      return data;
    },
  });
}

export function useWalletBalance(enabled = true) {
  return useQuery<WalletBalance>({
    queryKey: ['wallet', 'balance'],
    queryFn: async () => {
      const { data } = await api.get('/wallet/balance');
      return data;
    },
    enabled,
  });
}

export function useWalletTransactions(take = 20, skip = 0) {
  return useQuery<WalletTransactionsResponse>({
    queryKey: ['wallet', 'transactions', take, skip],
    queryFn: async () => {
      const { data } = await api.get('/wallet/transactions', {
        params: { take, skip },
      });
      return data;
    },
  });
}

export function useWalletRefetch() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
  };
}
