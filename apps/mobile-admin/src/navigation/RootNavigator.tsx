import React from 'react';
import {View, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {DefaultTheme} from '@react-navigation/native';
import {useAuthStore} from '../stores/authStore';
import {
  RootStackParamList,
  OwnerTabParamList,
  StaffTabParamList,
} from '../types';
import {Colors, FontSize, FontWeight} from '../theme';
import {
  BarChart3,
  Calendar,
  ChartColumn,
  Clock3,
  UserRound,
} from 'lucide-react-native';

// Screens
import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import OtpVerifyScreen from '../screens/auth/OtpVerifyScreen';
import ShopSetupScreen from '../screens/onboarding/ShopSetupScreen';
import BookingDetailScreen from '../screens/bookings/BookingDetailScreen';
import VerifyCodeScreen from '../screens/bookings/VerifyCodeScreen';
import ServiceFormScreen from '../screens/services/ServiceFormScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import ShopSettingsScreen from '../screens/settings/ShopSettingsScreen';
import WorkingHoursScreen from '../screens/settings/WorkingHoursScreen';
import StaffManagementScreen from '../screens/settings/StaffManagementScreen';
import AnalyticsScreen from '../screens/settings/AnalyticsScreen';
import PayoutDetailsScreen from '../screens/settings/PayoutDetailsScreen.tsx';
import OwnerDashboardScreen from '../screens/owner/OwnerDashboardScreen';
import LiveQueueScreen from '../screens/owner/LiveQueueScreen';
import AllBookingsScreen from '../screens/owner/AllBookingsScreen';
import OwnerEarningsScreen from '../screens/owner/OwnerEarningsScreen';
import MyDayScreen from '../screens/staff/MyDayScreen';
import MyQueueScreen from '../screens/staff/MyQueueScreen';
import MyEarningsScreen from '../screens/staff/MyEarningsScreen';
import MyProfileScreen from '../screens/staff/MyProfileScreen';
import MyServicesScreen from '../screens/staff/MyServicesScreen';
import MyScheduleScreen from '../screens/staff/MyScheduleScreen';
import MyReviewsScreen from '../screens/staff/MyReviewsScreen';
import NotificationSettingsScreen from '../screens/staff/NotificationSettingsScreen';
import PaymentUPIScreen from '../screens/staff/PaymentUPIScreen';
import PendingApprovalsScreen from '../screens/staff/PendingApprovalsScreen';
import LocationMapScreen from '../screens/staff/LocationMapScreen';
import PreArrivalChatScreen from '../screens/staff/PreArrivalChatScreen';
import AddStaffScreen from '../screens/settings/AddStaffScreen';


const Stack = createNativeStackNavigator<RootStackParamList>();
const OwnerTab = createBottomTabNavigator<OwnerTabParamList>();
const StaffTab = createBottomTabNavigator<StaffTabParamList>();

function TabIcon({
  name,
  color,
  size,
  focused,
}: {
  name: string;
  color: string;
  size: number;
  focused: boolean;
}) {
  const IconComponent = {
    dashboard: LayoutDashboard,
    staff: Users,
    shop: Store,
    payments: CreditCard,
    settings: Settings,
    services: Scissors,
    timing: Clock,
    reviews: Star,
    profile: UserRound,
  }[name] || LayoutDashboard;

  return (
    <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
      <IconComponent color={color} size={size - 2} />
    </View>
  );
}

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.textPrimary,
    border: Colors.border,
    notification: Colors.primary,
  },
};

const tabScreenOptions = {
  tabBarActiveTintColor: Colors.primary,
  tabBarInactiveTintColor: Colors.gray400,
  tabBarStyle: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: 8,
    paddingTop: 8,
    height: 64,
  },
  tabBarLabelStyle: {
    fontSize: FontSize.label,
    fontWeight: FontWeight.medium,
  },
  headerShown: false,
} as const;

function OwnerTabs() {
  return (
    <OwnerTab.Navigator screenOptions={tabScreenOptions}>
      <OwnerTab.Screen
        name="Dashboard"
        component={OwnerDashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({color, size, focused}) => (
            <TabIcon name="dashboard" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <OwnerTab.Screen
        name="Staff"
        component={StaffManagementScreen}
        options={{
          tabBarLabel: 'Staff',
          tabBarIcon: ({color, size, focused}) => (
            <TabIcon name="staff" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <OwnerTab.Screen
        name="Shop"
        component={ShopSettingsScreen}
        options={{
          tabBarLabel: 'Shop',
          tabBarIcon: ({color, size, focused}) => (
            <TabIcon name="shop" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <OwnerTab.Screen
        name="Payments"
        component={PayoutDetailsScreen}
        options={{
          tabBarLabel: 'Payments',
          tabBarIcon: ({color, size, focused}) => (
            <TabIcon name="payments" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <OwnerTab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({color, size, focused}) => (
            <TabIcon name="settings" color={color} size={size} focused={focused} />
          ),
        }}
      />
    </OwnerTab.Navigator>
  );
}

function StaffTabs() {
  return (
    <StaffTab.Navigator screenOptions={tabScreenOptions}>
      <StaffTab.Screen
        name="Dashboard"
        component={MyDayScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({color, size, focused}) => (
            <TabIcon name="dashboard" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <StaffTab.Screen
        name="Services"
        component={MyServicesScreen}
        options={{
          tabBarLabel: 'Services',
          tabBarIcon: ({color, size, focused}) => (
            <TabIcon name="services" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <StaffTab.Screen
        name="Timing"
        component={MyScheduleScreen}
        options={{
          tabBarLabel: 'Timing',
          tabBarIcon: ({color, size, focused}) => (
            <TabIcon name="timing" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <StaffTab.Screen
        name="Reviews"
        component={MyReviewsScreen}
        options={{
          tabBarLabel: 'Reviews',
          tabBarIcon: ({color, size, focused}) => (
            <TabIcon name="reviews" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <StaffTab.Screen
        name="Settings"
        component={MyProfileScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({color, size, focused}) => (
            <TabIcon name="settings" color={color} size={size} focused={focused} />
          ),
        }}
      />
    </StaffTab.Navigator>
  );
}

export default function RootNavigator() {
  const {
    isAuthenticated,
    isLoading,
    pendingOtpVerification,
    otpPhone,
    isStaff,
    isOwner,
    user,
  } = useAuthStore();

  // Owner has no shops yet → needs the shop setup wizard
  const needsShopSetup =
    isAuthenticated && isOwner && (!user?.shops || user.shops.length === 0);

  if (isLoading) {
    return (
      <NavigationContainer theme={AppTheme}>
        <Stack.Navigator screenOptions={{headerShown: false}}>
          <Stack.Screen name="Splash" component={SplashScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={AppTheme}>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {!isAuthenticated && !pendingOtpVerification ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen
              name="OtpVerify"
              component={OtpVerifyScreen}
              options={{headerShown: true, title: 'Verify Phone'}}
            />
          </>
        ) : pendingOtpVerification && otpPhone ? (
          <Stack.Screen
            name="OtpVerify"
            component={OtpVerifyScreen}
            initialParams={{phone: otpPhone, flow: 'LOGIN_2FA'}}
            options={{headerShown: true, title: 'Verify Identity'}}
          />
        ) : needsShopSetup ? (
          <Stack.Screen name="ShopSetup" component={ShopSetupScreen} />
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={isStaff ? StaffTabs : OwnerTabs}
            />
            <Stack.Screen
              name="OtpVerify"
              component={OtpVerifyScreen}
              options={{headerShown: true, title: 'Verify Phone'}}
            />
            <Stack.Screen
              name="BookingDetail"
              component={BookingDetailScreen}
              options={{headerShown: true, title: 'Booking Details'}}
            />
            <Stack.Screen
              name="VerifyCode"
              component={VerifyCodeScreen}
              options={{
                headerShown: true,
                title: 'Verify Code',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="ServiceForm"
              component={ServiceFormScreen}
              options={{headerShown: true, title: 'Service'}}
            />
            <Stack.Screen
              name="ShopSettings"
              component={ShopSettingsScreen}
              options={{headerShown: true, title: 'Shop Settings'}}
            />
            <Stack.Screen
              name="WorkingHours"
              component={WorkingHoursScreen}
              options={{headerShown: true, title: 'Working Hours'}}
            />
            <Stack.Screen
              name="AddStaff"
              component={AddStaffScreen}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="StaffManagement"
              component={StaffManagementScreen}
              options={{headerShown: true, title: 'Staff Management'}}
            />
            <Stack.Screen
              name="Analytics"
              component={AnalyticsScreen}
              options={{headerShown: true, title: 'Analytics'}}
            />
            <Stack.Screen
              name="PayoutDetails"
              component={PayoutDetailsScreen}
              options={{headerShown: true, title: 'Payout Details'}}
            />
            <Stack.Screen
              name="MyServices"
              component={MyServicesScreen}
              options={{headerShown: true, title: 'My Services'}}
            />
            <Stack.Screen
              name="MySchedule"
              component={MyScheduleScreen}
              options={{headerShown: true, title: 'My Schedule'}}
            />
            <Stack.Screen
              name="MyReviews"
              component={MyReviewsScreen}
              options={{headerShown: true, title: 'My Reviews'}}
            />
            <Stack.Screen
              name="NotificationSettings"
              component={NotificationSettingsScreen}
              options={{headerShown: true, title: 'Notification Settings'}}
            />
            <Stack.Screen
              name="PaymentUPI"
              component={PaymentUPIScreen}
              options={{headerShown: true, title: 'Payment UPI'}}
            />
            <Stack.Screen
              name="PendingApprovals"
              component={PendingApprovalsScreen}
              options={{headerShown: true, title: 'Pending Approvals'}}
            />
            <Stack.Screen
              name="LocationMap"
              component={LocationMapScreen}
              options={{headerShown: true, title: 'Location Map'}}
            />
            <Stack.Screen
              name="PreArrivalChat"
              component={PreArrivalChatScreen}
              options={{headerShown: true, title: 'Pre-Arrival Chat'}}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: Colors.primary100,
  },
});
