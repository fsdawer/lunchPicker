import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Restaurant } from '../features/restaurants/api';
import { RestaurantThumbnail } from './RestaurantThumbnail';

export function RestaurantListCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${restaurant.name}, 직선거리 ${restaurant.distanceMeters.toLocaleString()}미터, 상세 보기`}
      onPress={() => router.push({ pathname: '/restaurants/[id]', params: { id: String(restaurant.id) } })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.thumbnail}>
        <RestaurantThumbnail restaurantId={restaurant.id} />
      </View>
      <View style={styles.text}>
        <Text style={styles.kind}>주변 음식점</Text>
        <Text style={styles.name} numberOfLines={2}>{restaurant.name}</Text>
        <View style={styles.meta}>
          <Ionicons name="location-outline" size={15} color="#64748B" />
          <Text style={styles.distance}>직선거리 {restaurant.distanceMeters.toLocaleString()} m</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: '#F3E8E1', flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 120 },
  thumbnail: { width: 96, height: 96, borderRadius: 16, overflow: 'hidden', flexShrink: 0 },
  text: { flex: 1, minWidth: 0, justifyContent: 'center' },
  kind: { color: '#9A3412', fontSize: 12, fontWeight: '700', marginBottom: 5 },
  name: { color: '#1F2937', fontSize: 17, fontWeight: '700', lineHeight: 23 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 7 },
  distance: { color: '#64748B', fontSize: 13 },
  pressed: { opacity: 0.75 },
});
