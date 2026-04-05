import React from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  RefreshControl, 
  ActivityIndicator, 
  Dimensions, 
  TouchableOpacity,
  StatusBar
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { walletApi } from '../../api/client';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights, Shadows } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Banknote, 
  CreditCard, 
  Clock, 
  Gift, 
  Sparkles, 
  Plus, 
  ChevronRight, 
  History,
  ShieldCheck,
  TrendingUp
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

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
  FREE_CASH_CREDIT: { icon: <TrendingUp color="#10B981" size={18} />, color: '#10B981', prefix: '+' },
  FREE_CASH_DEBIT: { icon: <CreditCard color="#F43F5E" size={18} />, color: '#F43F5E', prefix: '-' },
  REFUND: { icon: <History color="#10B981" size={18} />, color: '#10B981', prefix: '+' },
  REWARD: { icon: <Gift color="#10B981" size={18} />, color: '#10B981', prefix: '+' },
  ADMIN_CREDIT: { icon: <Sparkles color="#6366F1" size={18} />, color: '#6366F1', prefix: '+' },
  ADMIN_DEBIT: { icon: <Clock color="#F43F5E" size={18} />, color: '#F43F5E', prefix: '-' },
};

export default function WalletScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery<WalletData>({
    queryKey: ['wallet'],
    queryFn: () => walletApi.get().then(res => res.data),
  });

  const renderTransaction = ({ item, index }: { item: WalletTransaction; index: number }) => {
    const cfg = txConfig[item.type] || { icon: <Banknote color="#64748B" size={18} />, color: '#64748B', prefix: '' };
    return (
      <TouchableOpacity style={styles.txCard} activeOpacity={0.7}>
        <View style={styles.txIconWrap}>
          {cfg.icon}
        </View>
        <View style={styles.txDetails}>
          <Text style={styles.txDesc} numberOfLines={1}>{item.description}</Text>
          <Text style={styles.txDate}>{format(new Date(item.createdAt), 'MMM d, h:mm a')}</Text>
        </View>
        <View style={styles.txAmountCol}>
          <Text style={[styles.txAmount, { color: cfg.color }]}>
            {cfg.prefix}₹{item.amount}
          </Text>
          <Text style={styles.txStatus}>Success</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <>
      {/* Immersive Balance Card */}
      <View style={styles.balanceContainer}>
        <View style={styles.balanceCard}>
          <View style={styles.cardGlow} />
          <View style={styles.cardHeader}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>ACTIVE WALLET</Text>
            </View>
            <ShieldCheck size={20} color="rgba(255,255,255,0.4)" />
          </View>
          
          <Text style={styles.balanceLabel}>Account Balance</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.currencySymbol}>₹</Text>
            <Text style={styles.balanceValue}>{data?.balance?.toLocaleString() || '0'}</Text>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Lifetime Earned</Text>
              <Text style={styles.statValue}>₹{data?.totalEarned || 0}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Saved</Text>
              <Text style={styles.statValue}>₹{data?.totalSpent || 0}</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionBtn}>
            <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
              <Plus size={22} color="#4F46E5" />
            </View>
            <Text style={styles.actionText}>Add Money</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <View style={[styles.actionIcon, { backgroundColor: '#ECFDF5' }]}>
              <TrendingUp size={22} color="#10B981" />
            </View>
            <Text style={styles.actionText}>Rewards</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <View style={[styles.actionIcon, { backgroundColor: '#FFF7ED' }]}>
              <History size={22} color="#F59E0B" />
            </View>
            <Text style={styles.actionText}>Tax Invoices</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <TouchableOpacity>
          <Text style={styles.viewAll}>Filter</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Overline Wallet</Text>
        </View>
        
        <FlatList
          data={data?.transactions || []}
          keyExtractor={item => item.id}
          renderItem={renderTransaction}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  topBarTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  balanceContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  balanceCard: {
    height: 220,
    backgroundColor: '#0F172A',
    borderRadius: 36,
    padding: 28,
    ...Shadows.lg,
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: -height * 0.1,
    right: -width * 0.1,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: (width * 0.7) / 2,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 9,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    marginRight: 4,
  },
  balanceValue: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFF',
  },
  cardFooter: {
    flexDirection: 'row',
    marginTop: 'auto',
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingHorizontal: 8,
  },
  actionBtn: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  listContent: {
    paddingBottom: 40,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Shadows.sm,
  },
  txIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  txDetails: {
    flex: 1,
  },
  txDesc: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  txDate: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
  txAmountCol: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '900',
  },
  txStatus: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
