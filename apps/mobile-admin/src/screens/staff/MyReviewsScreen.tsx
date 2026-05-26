import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { reviewsApi } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { Colors, Shadows, Radius } from '../../theme';
import { ReviewItem, StaffReviewsResponse } from '../../types';
import { format } from 'date-fns';
import { 
  Star, 
  MessageSquare, 
  Search, 
  ChevronDown, 
  Filter, 
  Globe, 
  ShieldCheck,
  ThumbsUp,
  Smile,
  Frown
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MyReviewsScreen() {
  const { selectedShopId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'ALL' | 'GOOGLE' | 'PLATFORM'>('ALL');

  const {
    data: response,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<StaffReviewsResponse>({
    queryKey: ['staffMyReviews', selectedShopId, activeTab],
    queryFn: () => reviewsApi.getMyStaffReviews(selectedShopId!, { limit: 20 }).then(res => res.data),
    enabled: !!selectedShopId,
  });

  const reviews = response?.data || [];
  const stats = response?.stats || { averageRating: 4.8, totalReviews: 24 };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const renderReview = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.user?.name?.charAt(0) || 'G'}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{item.user?.name || 'Verified Customer'}</Text>
            <Text style={styles.serviceMeta}>{item.booking?.services?.[0]?.serviceName || 'Premium Haircut'}</Text>
          </View>
        </View>
        <View style={styles.sourceBadge}>
          {item.isGoogle ? (
            <View style={styles.googleWrap}><Globe size={10} color="#4285F4" /><Text style={styles.googleText}>Google</Text></View>
          ) : (
            <View style={styles.platformWrap}><ShieldCheck size={10} color={Colors.primary} /><Text style={styles.platformText}>Verified</Text></View>
          )}
        </View>
      </View>
      
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map(s => (
          <Star key={s} size={14} color={s <= (item.rating || 5) ? "#F59E0B" : "#E2E8F0"} fill={s <= (item.rating || 5) ? "#F59E0B" : "transparent"} />
        ))}
        <Text style={styles.dateText}>
          {item.createdAt ? format(new Date(item.createdAt), 'MMM dd, yyyy') : 'Recently'}
        </Text>
      </View>

      <Text style={styles.comment}>{item.comment || "No comment left."}</Text>
      
      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.likeBtn}>
          <ThumbsUp size={14} color="#94A3B8" />
          <Text style={styles.likeText}>Helpful</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.replyBtn}>
          <MessageSquare size={14} color={Colors.primary} />
          <Text style={styles.replyText}>Reply</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Trust & Reputation</Text>
            <Text style={styles.subtitle}>Verified specialist performance score</Text>
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <Filter size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsPanel}>
          <View style={styles.statMain}>
             <Text style={styles.statVal}>{stats.averageRating.toFixed(1)}</Text>
             <View style={styles.statMeta}>
               <View style={styles.stars}>
                 {[1,2,3,4,5].map(s => <Star key={s} size={12} color="#F59E0B" fill="#F59E0B" />)}
               </View>
               <Text style={styles.statLabel}>{stats.totalReviews} REVIEWS</Text>
             </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.sentiment}>
            <View style={styles.sentimentItem}>
              <Smile size={16} color="#10B981" />
              <Text style={styles.sentimentVal}>94% Positive</Text>
            </View>
            <View style={styles.sentimentItem}>
              <Frown size={16} color="#F43F5E" />
              <Text style={styles.sentimentVal}>2% Critical</Text>
            </View>
          </View>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, activeTab === 'ALL' && styles.tabActive]} onPress={() => setActiveTab('ALL')}>
            <Text style={[styles.tabText, activeTab === 'ALL' && styles.tabTextActive]}>ALL SOURCE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'PLATFORM' && styles.tabActive]} onPress={() => setActiveTab('PLATFORM')}>
            <Text style={[styles.tabText, activeTab === 'PLATFORM' && styles.tabTextActive]}>OVERLINE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'GOOGLE' && styles.tabActive]} onPress={() => setActiveTab('GOOGLE')}>
            <Text style={[styles.tabText, activeTab === 'GOOGLE' && styles.tabTextActive]}>GOOGLE</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={reviews}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
          contentContainerStyle={styles.list}
          renderItem={renderReview}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              <MessageSquare size={48} color="#CBD5E1" />
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B', marginTop: 16 }}>No Reviews Yet</Text>
              <Text style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>You will see customer feedback here.</Text>
            </View>
          }
        />

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', fontWeight: '800', marginTop: 2 },
  filterBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.sm },
  statsPanel: { flexDirection: 'row', backgroundColor: '#FFF', marginHorizontal: 24, padding: 24, borderRadius: 32, marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.sm },
  statMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 16 },
  statVal: { fontSize: 36, fontWeight: '900', color: '#0F172A' },
  statMeta: { gap: 4 },
  stars: { flexDirection: 'row', gap: 2 },
  statLabel: { fontSize: 9, fontWeight: '900', color: '#94A3B8', letterSpacing: 1 },
  divider: { width: 1, backgroundColor: '#F1F5F9', marginHorizontal: 20 },
  sentiment: { gap: 12 },
  sentimentItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sentimentVal: { fontSize: 12, fontWeight: '800', color: '#1E293B' },
  tabs: { flexDirection: 'row', gap: 8, marginHorizontal: 24, marginBottom: 20 },
  tab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F1F5F9' },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 0.5 },
  tabTextActive: { color: '#FFF' },
  list: { paddingHorizontal: 24, paddingBottom: 40 },
  card: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9', ...Shadows.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '900', color: Colors.primary },
  userName: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  serviceMeta: { fontSize: 11, color: '#94A3B8', fontWeight: '700', marginTop: 2 },
  sourceBadge: { },
  googleWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  googleText: { fontSize: 9, fontWeight: '900', color: '#4285F4' },
  platformWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  platformText: { fontSize: 9, fontWeight: '900', color: '#10B981' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  dateText: { fontSize: 11, color: '#CBD5E1', fontWeight: '700', marginLeft: 8 },
  comment: { fontSize: 14, color: '#475569', lineHeight: 22, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  likeText: { fontSize: 12, fontWeight: '800', color: '#94A3B8' },
  replyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  replyText: { fontSize: 12, fontWeight: '800', color: Colors.primary },
});
