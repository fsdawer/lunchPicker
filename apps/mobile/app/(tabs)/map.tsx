import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker, type Region } from 'react-native-maps';
import { useArea } from '../../src/features/restaurants/AreaContext';
import { getMapRestaurants, type MapRestaurant } from '../../src/features/restaurants/api';

export default function MapScreen() {
  const { area } = useArea();
  const initialRegion: Region = { latitude: area.latitude, longitude: area.longitude, latitudeDelta: 0.055, longitudeDelta: 0.07 };
  const [region, setRegion] = useState<Region>(initialRegion);
  const [restaurants, setRestaurants] = useState<MapRestaurant[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setRegion({ latitude: area.latitude, longitude: area.longitude, latitudeDelta: 0.055, longitudeDelta: 0.07 });
  }, [area]);

  useEffect(() => {
    if (region.latitudeDelta > 0.12 || region.longitudeDelta > 0.12) {
      setRestaurants([]);
      setError('지도를 확대하면 음식점을 보여드려요.');
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const south = region.latitude - region.latitudeDelta / 2;
    const north = region.latitude + region.latitudeDelta / 2;
    const west = region.longitude - region.longitudeDelta / 2;
    const east = region.longitude + region.longitudeDelta / 2;
    getMapRestaurants(south, north, west, east, area.latitude, area.longitude, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setRestaurants(result.restaurants);
        setTruncated(result.truncated);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '지도 정보를 불러오지 못했어요.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [region, area, attempt]);

  return (
    <View style={styles.screen}>
      <MapView key={area.id} style={StyleSheet.absoluteFill} initialRegion={initialRegion}
        onRegionChangeComplete={setRegion}>
        {restaurants.map((restaurant) => (
          <Marker key={restaurant.id} coordinate={{ latitude: restaurant.latitude, longitude: restaurant.longitude }}
            onCalloutPress={() => router.push({ pathname: '/restaurants/[id]', params: { id: String(restaurant.id) } })}>
            <Callout><View style={styles.callout}><Text style={styles.calloutTitle}>{restaurant.name}</Text><Text>상세 보기 →</Text></View></Callout>
          </Marker>
        ))}
      </MapView>
      <View style={styles.info}>
        {loading ? <ActivityIndicator color="#C2410C" /> : null}
        <Text style={styles.infoText}>{loading ? '음식점을 불러오는 중이에요' : error ?? (truncated ? '식당이 많아요. 지도를 확대하면 더 정확히 볼 수 있어요.' : restaurants.length ? `${restaurants.length}곳의 음식점` : '이 화면에 음식점이 없어요.')}</Text>
        {error && !error.startsWith('지도를 확대') ? <Pressable accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)} style={styles.retry}><Text style={styles.retryText}>다시 시도</Text></Pressable> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF9F5' },
  info: { position: 'absolute', top: 16, left: 16, right: 16, backgroundColor: '#FFFFFF', borderRadius: 14, minHeight: 48, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  infoText: { flex: 1, color: '#334155', fontSize: 14, fontWeight: '600' },
  retry: { padding: 8, minHeight: 44, justifyContent: 'center' },
  retryText: { color: '#C2410C', fontWeight: '700' },
  callout: { minWidth: 120, padding: 8 },
  calloutTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
});
