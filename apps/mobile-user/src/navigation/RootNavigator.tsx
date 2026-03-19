import React, { useState, useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../stores/authStore';
import { RootStackParamList, MainTabParamList } from '../types';
import { Colors, FontWeights, Shadows } from '../theme';
import { View, Text, StyleSheet } from 'react-native';
import { Home, Calendar, Wallet, User } from 'lucide-react-native';

// Screens
import SplashScreen from '../screens/auth/SplashScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import OtpVerifyScreen from '../screens/auth/OtpVerifyScreen';
import HomeScreen from '../screens/home/HomeScreen';
import ShopDetailScreen from '../screens/home/ShopDetailScreen';
import BookingScreen from '../screens/booking/BookingScreen';
import BookingDetailScreen from '../screens/booking/BookingDetailScreen';
import BookingConfirmationScreen from '../screens/booking/BookingConfirmationScreen';
import MyBookingsScreen from '../screens/booking/MyBookingsScreen';
import WalletScreen from '../screens/wallet/WalletScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Custom dark theme
const DarkTheme = {
  ...DefaultTheme,
  dark: true,
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

// Tab icon component
function TabIcon({ name, focused, color, size }: { name: string; focused: boolean; color: string; size: number }) {
  const IconComponent = {
    home: Home,
    calendar: Calendar,
    wallet: Wallet,
    user: User,
  }[name] || Home;

  return (
    <View style={[styles.tabIconContainer, focused && styles.tabIconActive]}>
      <IconComponent color={color} size={size} />
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
          ...Shadows.md,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: FontWeights.semibold,
          letterSpacing: 0.3,
        },
        headerShown: false,
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="home" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="MyBookings"
        component={MyBookingsScreen}
        options={{
          tabBarLabel: 'Bookings',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="calendar" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          tabBarLabel: 'Wallet',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="wallet" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="user" color={color} size={size} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('hasLaunched').then((value) => {
      if (value === null) {
        setIsFirstLaunch(true);
      } else {
        setIsFirstLaunch(false);
      }
    });
  }, []);

  if (isLoading || isFirstLaunch === null) {
    return (
      <NavigationContainer theme={DarkTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={DarkTheme}>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? "Main" : (isFirstLaunch ? "Onboarding" : "Login")}
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: { fontWeight: FontWeights.semibold },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}>
        {!isAuthenticated ? (
          <>
            {isFirstLaunch && <Stack.Screen name="Onboarding" component={OnboardingScreen} />}
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen
              name="OtpVerify"
              component={OtpVerifyScreen}
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="ShopDetail"
              component={ShopDetailScreen}
            />
            <Stack.Screen
              name="Booking"
              component={BookingScreen}
              options={{
                headerShown: true,
                title: 'Book Appointment',
              }}
            />
            <Stack.Screen
              name="BookingDetail"
              component={BookingDetailScreen}
              options={{
                headerShown: true,
                title: 'Booking Details',
              }}
            />
            <Stack.Screen
              name="BookingConfirmation"
              component={BookingConfirmationScreen}
              options={{
                headerShown: false,
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconActive: {
    backgroundColor: Colors.primaryGhost,
  },
});
