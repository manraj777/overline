import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../../types';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius, Shadows } from '../../theme';
import { PrimaryButton } from '../../components/ui';
import { MapPin, Scissors, Clock } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Discover Local Experts',
    description: 'Find top-rated salons, clinics, and spas near your location.',
    icon: <MapPin color={Colors.primary} size={64} />,
  },
  {
    id: '2',
    title: 'Book Services',
    description: 'Easily book your favorite services with a few taps.',
    icon: <Scissors color={Colors.primary} size={64} />,
  },
  {
    id: '3',
    title: 'Zero Wait Time',
    description: 'Track live queues and walk in exactly when it’s your turn.',
    icon: <Clock color={Colors.primary} size={64} />,
  },
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function OnboardingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList>(null);

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    setCurrentIndex(viewableItems[0]?.index || 0);
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasLaunched', 'true');
      navigation.replace('Login');
    } catch (error) {
      console.log('Error saving onboarding status', error);
    }
  };

  const scrollToNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      completeOnboarding();
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={SLIDES}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.iconContainer}>{item.icon}</View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        ref={slidesRef}
      />

      <View style={styles.footer}>
        <View style={styles.paginator}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i.toString()}
                style={[styles.dot, { width: dotWidth, opacity }]}
              />
            );
          })}
        </View>

        <PrimaryButton
          title={currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          onPress={scrollToNext}
          style={styles.button}
        />
        
        {currentIndex < SLIDES.length - 1 && (
          <TouchableOpacity onPress={completeOnboarding} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  slide: {
    width,
    alignItems: 'center',
    padding: Spacing['2xl'],
    paddingTop: height * 0.2,
  },
  iconContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing['4xl'],
    ...Shadows.lg,
  },
  title: {
    fontSize: FontSizes['3xl'],
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  description: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: Spacing.md,
  },
  footer: {
    padding: Spacing['2xl'],
    paddingBottom: Spacing['4xl'],
  },
  paginator: {
    flexDirection: 'row',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginHorizontal: 4,
  },
  button: {
    marginBottom: Spacing.md,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  skipText: {
    color: Colors.textTertiary,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
});
