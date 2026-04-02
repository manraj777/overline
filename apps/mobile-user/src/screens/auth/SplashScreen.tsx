import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Colors, FontSizes, FontWeights, Shadows } from '../../theme';

const BRAND_LOGO = require('../../../assets/branding/overline-logo.png');

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [fadeAnim, scaleAnim, pulseAnim]);

  return (
    <View style={styles.container}>
      {/* Background decoration */}
      <View style={styles.bgOrb1} />
      <View style={styles.bgOrb2} />
      <View style={styles.bgOrb3} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}>
        <Animated.Image
          source={BRAND_LOGO}
          style={[
            styles.logoImage,
            { transform: [{ scale: pulseAnim }] },
          ]}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>Queue free life</Text>
      </Animated.View>

      {/* Bottom loading */}
      <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
        <View style={styles.loadingBar}>
          <Animated.View
            style={[
              styles.loadingProgress,
              { transform: [{ scaleX: pulseAnim }] },
            ]}
          />
        </View>
        <Text style={styles.loadingText}>Loading your experience...</Text>
      </Animated.View>
    </View>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgOrb1: {
    position: 'absolute',
    top: height * 0.15,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
  },
  bgOrb2: {
    position: 'absolute',
    bottom: height * 0.2,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(0, 210, 255, 0.06)',
  },
  bgOrb3: {
    position: 'absolute',
    top: height * 0.4,
    left: '40%',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
  },
  content: {
    alignItems: 'center',
  },
  logoImage: {
    width: 220,
    height: 220,
    marginBottom: 16,
    borderRadius: 20,
    ...Shadows.glow,
  },
  tagline: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
    letterSpacing: 1,
    fontWeight: FontWeights.medium,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  loadingBar: {
    width: 120,
    height: 3,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  loadingProgress: {
    width: '50%',
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  loadingText: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    letterSpacing: 1,
  },
});
