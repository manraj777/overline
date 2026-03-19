import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { walletApi } from '../../api/client';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, Shadows } from '../../theme';
import { GlassCard, EmptyState } from '../../components/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banknote, CreditCard, Clock, Gift, Sparkles } from 'lucide-react-native';

interface WalletTransaction {
  id: string;
  type: 'FREE_CASH_CREDIT' | 'FREE_CASH_DEBIT' | 'FREE_CASH_RETURN' | 'REFUND' | 'REWARD' | 'ADMIN_CREDIT' | 'ADMIN_DEBIT';
  amount: number;
  description: string;
  createdAt: string;
  booking?: { bookingNumber: string; shop?: { name: string } };
}

interface WalletData {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  transactions: WalletTransaction[];
}

const txConfig: Record<string, { icon: React.ReactNode; color: string; prefix: string }> = {
  FREE_CASH_CREDIT: { icon: <Banknote color={Colors.success} size={20} />, color: Colors.success, prefix: '+' },
  FREE_CASH_DEBIT: { icon: <CreditCard color={Colors.error} size={20} />, color: Colors.error, prefix: '-' },
  FREE_CASH_RETURN: { icon: <Banknote color={Colors.success} size={20} />, color: Colors.success, prefix: '+' },
  REFUND: { icon: <CreditCard color={Colors.success} size={20} />, color: Colors.success, prefix: '+' },
  REWARD: { icon: <Gift color={Colors.success} size={20} />, color: Colors.success, prefix: '+' },
  ADMIN_CREDIT: { icon: <Sparkles color={Colors.success} size={20} />, color: Colors.success, prefix: '+' },
  ADMIN_DEBIT: { icon: <Clock color={Colors.error} size={20} />, color: Colors.error, prefix: '-' },
};

export default function WalletScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery<WalletData>({
    queryKey: ['wallet'],
    queryFn: () => walletApi.get().then(res => res.data),
  });

  const renderTransaction = ({ item }: { item: WalletTransaction }) => {
    const cfg = txConfig[item.type] || { icon: <Banknote color={Colors.textSecondary} size={20} />, color: Colors.textSecondary, prefix: '' };
    return (
      <View style={styles.txCard}>
        <View style={styles.txIconWrap}>
          {cfg.icon}
        </View>
        <View style={styles.txDetails}>
          <Text style={styles.txDesc}>{item.description}</Text>
          {item.booking && (
            <Text style={styles.txMeta}>{item.booking.shop?.name} · {item.booking.bookingNumber}</Text>
          )}
          <Text style={styles.txDate}>{format(new Date(item.createdAt), 'MMM d, yyyy · h:mm a')}</Text>
        </View>
        <Text style={[styles.txAmount, { color: cfg.color }]}>
          {cfg.prefix}₹{item.amount}
        </Text>
      </View>
    );
  };

  const renderHeader = () => (
    <>
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceGlow} />
        <Text style={styles.balanceLabel}>Free Cash Balance</Text>
        <Text style={styles.balanceAmount}>₹{data?.balance || 0}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹{data?.totalEarned || 0}</Text>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹{data?.totalSpent || 0}</Text>
            <Text style={styles.statLabel}>Used</Text>
          </View>
        </View>
      </View>

      {/* How it works */}
      <GlassCard style={{ marginHorizontal: Spacing.xl, marginBottom: Spacing.xl }}>
        <Text style={styles.howTitle}>How Free Cash Works</Text>
        {[
          { icon: <Sparkles color={Colors.textSecondary} size={16} />, text: 'Earn 2% free cash on every booking' },
          { icon: <Gift color={Colors.textSecondary} size={16} />, text: 'Get ₹50 for every friend you refer' },
          { icon: <CreditCard color={Colors.textSecondary} size={16} />, text: 'Use free cash on your next booking' },
          { icon: <Clock color={Colors.textSecondary} size={16} />, text: 'Free cash expires after 90 days' },
        ].map((item, i) => (
          <View key={i} style={styles.howRow}>
            <View style={{ width: 24, alignItems: 'center', justifyContent: 'center' }}>
              {item.icon}
            </View>
            <Text style={styles.howText}>{item.text}</Text>
          </View>
        ))}
      </GlassCard>

      <View style={styles.txHeader}>
        <Text style={styles.txTitle}>Transaction History</Text>
      </View>
    </>
  );

  if (isLoading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wallet</Text>
      </View>
      <FlatList
        data={data?.transactions || []}
        keyExtractor={item => item.id}
        renderItem={renderTransaction}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState icon="💰" title="No Transactions Yet" subtitle="Start booking to earn free cash rewards!" />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  headerTitle: { fontSize: FontSizes['2xl'], fontWeight: FontWeights.extrabold, color: Colors.textPrimary },
  listContent: { paddingBottom: 100 },
  // Balance card
  balanceCard: {
    margin: Spacing.xl, backgroundColor: Colors.primary, borderRadius: BorderRadius['2xl'],
    padding: Spacing['2xl'], alignItems: 'center', ...Shadows.glow, overflow: 'hidden',
  },
  balanceGlow: {
    position: 'absolute', top: -60, right: -60, width: 180, height: 180,
    borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  balanceLabel: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.6)', marginBottom: Spacing.sm, letterSpacing: 1, textTransform: 'uppercase' },
  balanceAmount: { fontSize: 52, fontWeight: FontWeights.extrabold, color: '#fff', marginBottom: Spacing['2xl'] },
  statsRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: '#fff', marginBottom: 2 },
  statLabel: { fontSize: FontSizes.xs, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.15)' },
  // How it works
  howTitle: { fontSize: FontSizes.md, fontWeight: FontWeights.bold, color: Colors.textPrimary, marginBottom: Spacing.lg },
  howRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: Spacing.md },
  howText: { fontSize: FontSizes.sm, color: Colors.textSecondary, flex: 1, lineHeight: 20 },
  // Transactions
  txHeader: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  txTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: Colors.textPrimary },
  txCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    marginHorizontal: Spacing.xl, marginBottom: Spacing.sm, padding: Spacing.lg,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border,
  },
  txIconWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceLight,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  txDetails: { flex: 1 },
  txDesc: { fontSize: FontSizes.sm, fontWeight: FontWeights.medium, color: Colors.textPrimary, marginBottom: 2 },
  txMeta: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginBottom: 2 },
  txDate: { fontSize: FontSizes.xs, color: Colors.textMuted },
  txAmount: { fontSize: FontSizes.md, fontWeight: FontWeights.bold, marginLeft: Spacing.md },
});
