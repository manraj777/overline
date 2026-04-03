import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuthStore} from '../../stores/authStore';
import {RootStackParamList} from '../../types';
import {Colors, FontSize, FontWeight, Radius, Spacing} from '../../theme';
import {ChevronRight, CreditCard, ListChecks, MessageSquareText, Star, UserRound} from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MyProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {user, logout} = useAuthStore();

  const shortcuts = [
    {key: 'services', title: 'My Services', icon: ListChecks, route: 'MyServices' as const},
    {key: 'schedule', title: 'My Schedule', icon: UserRound, route: 'MySchedule' as const},
    {key: 'reviews', title: 'My Reviews', icon: Star, route: 'MyReviews' as const},
    {key: 'notifications', title: 'Notification Settings', icon: MessageSquareText, route: 'NotificationSettings' as const},
    {key: 'payment', title: 'Payment UPI', icon: CreditCard, route: 'PaymentUPI' as const},
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{(user?.name || 'S').charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shortcuts</Text>
          {shortcuts.map(item => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.key}
                style={styles.menuItem}
                onPress={() => navigation.navigate(item.route)}>
                <Icon size={18} color={Colors.gray600} style={styles.menuIcon} />
                <Text style={styles.menuText}>{item.title}</Text>
                <ChevronRight size={16} color={Colors.gray400} />
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={() => logout()}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {
    backgroundColor: Colors.white,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  title: {fontSize: FontSize.h1, color: Colors.textPrimary, fontWeight: FontWeight.bold},
  content: {padding: Spacing.lg},
  userCard: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderColor: Colors.gray100,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {fontSize: FontSize.h1, color: Colors.primary700, fontWeight: FontWeight.bold},
  userName: {marginTop: 10, fontSize: FontSize.h2, color: Colors.textPrimary, fontWeight: FontWeight.semibold},
  userEmail: {marginTop: 4, fontSize: FontSize.body, color: Colors.textSecondary},
  section: {marginTop: Spacing.lg},
  sectionTitle: {
    marginBottom: Spacing.sm,
    fontSize: FontSize.label,
    color: Colors.textMuted,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
  },
  menuItem: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray100,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {marginRight: Spacing.sm},
  menuText: {flex: 1, color: Colors.textPrimary, fontSize: FontSize.body, fontWeight: FontWeight.medium},
  logoutButton: {
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.danger500,
    backgroundColor: Colors.danger50,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  logoutText: {color: Colors.danger700, fontSize: FontSize.body, fontWeight: FontWeight.semibold},
});
