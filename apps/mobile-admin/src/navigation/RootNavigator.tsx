import React from 'react';
import {View, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {DefaultTheme} from '@react-navigation/native';
import {useAuthStore} from '../stores/authStore';
import {RootStackParamList, MainTabParamList} from '../types';
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
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import BookingsScreen from '../screens/bookings/BookingsScreen';
import QueueScreen from '../screens/queue/QueueScreen';
import BookingDetailScreen from '../screens/bookings/BookingDetailScreen';
import VerifyCodeScreen from '../screens/bookings/VerifyCodeScreen';
import ServiceFormScreen from '../screens/services/ServiceFormScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import ShopSettingsScreen from '../screens/settings/ShopSettingsScreen';
import WorkingHoursScreen from '../screens/settings/WorkingHoursScreen';
import StaffManagementScreen from '../screens/settings/StaffManagementScreen';
import AnalyticsScreen from '../screens/settings/AnalyticsScreen';
import AnalyticsTabScreen from '../screens/analytics/AnalyticsTabScreen';
import PayoutDetailsScreen from '../screens/settings/PayoutDetailsScreen.tsx';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

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
    dashboard: BarChart3,
    queue: Clock3,
    bookings: Calendar,
    analytics: ChartColumn,
    profile: UserRound,
  }[name] || BarChart3;

  return (
    <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
      <IconComponent color={color} size={size - 1} />
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

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
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
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({color, size, focused}) => (
            <TabIcon name="dashboard" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Queue"
        component={QueueScreen}
        options={{
          tabBarLabel: 'Queue',
          tabBarIcon: ({color, size, focused}) => (
            <TabIcon name="queue" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{
          tabBarLabel: 'Bookings',
          tabBarIcon: ({color, size, focused}) => (
            <TabIcon name="bookings" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="AnalyticsTab"
        component={AnalyticsTabScreen}
        options={{
          tabBarLabel: 'Analytics',
          tabBarIcon: ({color, size, focused}) => (
            <TabIcon name="analytics" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({color, size, focused}) => (
            <TabIcon name="profile" color={color} size={size} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const {isAuthenticated, isLoading, pendingOtpVerification, otpPhone} =
    useAuthStore();

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
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : pendingOtpVerification && otpPhone ? (
          <Stack.Screen
            name="OtpVerify"
            component={OtpVerifyScreen}
            initialParams={{phone: otpPhone}}
            options={{headerShown: true, title: 'Verify Identity'}}
          />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
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
