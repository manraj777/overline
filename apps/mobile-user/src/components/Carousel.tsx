import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../theme';

const { width } = Dimensions.get('window');
const CAROUSEL_WIDTH = width - Spacing.xl * 2;
const ITEM_WIDTH = CAROUSEL_WIDTH;

export interface CarouselItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  tag?: string;
  onPress?: () => void;
}

interface CarouselProps {
  data: CarouselItem[];
  autoScroll?: boolean;
}

export const Carousel: React.FC<CarouselProps> = ({ data }) => {
  const scrollX = useRef(new Animated.Value(0)).current;

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={CAROUSEL_WIDTH + Spacing.md}
        decelerationRate="fast"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        renderItem={({ item }) => (
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={item.onPress}
            style={styles.itemContainer}
          >
            <Image source={{ uri: item.imageUrl }} style={styles.image} />
            <View style={styles.overlay} />
            
            <View style={styles.content}>
              {item.tag && (
                <View style={styles.tagContainer}>
                  <Text style={styles.tagText}>{item.tag}</Text>
                </View>
              )}
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <View style={styles.pagination}>
        {data.map((_, i) => {
          const opacity = scrollX.interpolate({
            inputRange: [
              (i - 1) * (CAROUSEL_WIDTH + Spacing.md),
              i * (CAROUSEL_WIDTH + Spacing.md),
              (i + 1) * (CAROUSEL_WIDTH + Spacing.md),
            ],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          const dotWidth = scrollX.interpolate({
            inputRange: [
              (i - 1) * (CAROUSEL_WIDTH + Spacing.md),
              i * (CAROUSEL_WIDTH + Spacing.md),
              (i + 1) * (CAROUSEL_WIDTH + Spacing.md),
            ],
            outputRange: [8, 20, 8],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={i}
              style={[styles.dot, { opacity, width: dotWidth }]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.lg,
  },
  itemContainer: {
    width: CAROUSEL_WIDTH,
    height: 180,
    marginRight: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.md,
    marginLeft: Spacing.xl,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  content: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
  },
  tagContainer: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  tagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
});
