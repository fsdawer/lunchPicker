import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { getRestaurantDetail, getRestaurantFavorite, recordRestaurantView, setRestaurantFavorite, type RestaurantDetail } from '../../src/features/restaurants/api';
import { useAuth } from '../../src/features/auth/AuthContext';
import { RestaurantThumbnail } from '../../src/components/RestaurantThumbnail';
import { ReviewSection } from '../../src/features/reviews/ReviewSection';
import { useRoulette } from '../../src/features/roulette/RouletteContext';

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const restaurantId = Number(id);
  const { candidates, toggleCandidate } = useRoulette();
  const { user, getToken } = useAuth();
  const viewedId = useRef<number | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [favoriteSaving, setFavoriteSaving] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!Number.isSafeInteger(restaurantId) || restaurantId < 1) {
      setError('식당 주소가 올바르지 않아요.');
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getRestaurantDetail(restaurantId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setRestaurant(result);
          if (viewedId.current !== restaurantId) {
            viewedId.current = restaurantId;
            void recordRestaurantView(restaurantId).catch(() => { viewedId.current = null; });
          }
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '식당 정보를 불러오지 못했어요.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [restaurantId, attempt]);

  useEffect(() => {
    if (!user || !Number.isSafeInteger(restaurantId) || restaurantId < 1) {
      setFavorite(false);
      return;
    }
    let active = true;
    getToken().then((token) => token ? getRestaurantFavorite(restaurantId, token) : null)
      .then((result) => { if (active && result) setFavorite(result.favorite); })
      .catch((cause: unknown) => { if (active) setFavoriteError(cause instanceof Error ? cause.message : '찜 상태를 읽지 못했어요.'); });
    return () => { active = false; };
  }, [restaurantId, user?.id]);

  // 로그인 사용자의 식당 찜 상태를 서버에 저장하고 화면에 반영한다.
  const toggleFavorite = async () => {
    if (!user) { router.push('/auth'); return; }
    if (favoriteSaving) return;
    setFavoriteSaving(true);
    setFavoriteError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('로그인이 필요해요.');
      const result = await setRestaurantFavorite(restaurantId, token, !favorite);
      setFavorite(result.favorite);
    } catch (cause) {
      setFavoriteError(cause instanceof Error ? cause.message : '찜을 변경하지 못했어요.');
    } finally {
      setFavoriteSaving(false);
    }
  };

  const selected = restaurant ? candidates.some((candidate) => candidate.id === restaurant.id) : false;
  const full = !selected && candidates.length >= 8;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="뒤로 가기" onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </Pressable>
        <Text style={styles.headerTitle}>식당 정보</Text>
        {restaurant && <Pressable accessibilityRole="button" accessibilityLabel={favorite ? '찜 해제' : '식당 찜하기'}
          accessibilityState={{ selected: favorite, disabled: favoriteSaving }} disabled={favoriteSaving}
          onPress={() => { void toggleFavorite(); }} style={styles.iconButton}>
          <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={25} color="#C2410C" />
        </Pressable>}
        {!restaurant && <View style={styles.iconButton} />}
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator color="#C2410C" /><Text style={styles.muted}>식당 정보를 불러오고 있어요.</Text></View>
        : error || !restaurant ? <View style={styles.center}>
          <Text style={styles.title}>식당 정보를 볼 수 없어요</Text>
          <Text style={styles.muted}>{error ?? '식당을 찾을 수 없어요.'}</Text>
          <Pressable accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)} style={styles.primaryButton}>
            <Text style={styles.primaryText}>다시 시도</Text>
          </Pressable>
        </View> : <>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>근처에서 찾은 한 끼</Text>
              <View style={styles.heroArtwork}><RestaurantThumbnail restaurantId={restaurant.id} size={154} /></View>
            </View>
            <View style={styles.summary}>
              <Text style={styles.category}>{restaurant.category || '주변 음식점'}</Text>
              <Text style={styles.title}>{restaurant.name}</Text>
              <View style={styles.addressLine}>
                <Ionicons name="location-outline" size={18} color="#9A3412" />
                <Text style={styles.addressText}>{restaurant.address || '주소 정보가 없어요.'}</Text>
              </View>
              {favoriteError && <Text style={styles.favoriteError}>{favoriteError}</Text>}
            </View>
            <View style={styles.card}>
              <View style={styles.sectionHeading}>
                <View style={styles.sectionIcon}><Ionicons name="restaurant-outline" size={19} color="#C2410C" /></View>
                <Text style={styles.sectionTitle}>메뉴</Text>
                <Text style={styles.sectionCount}>{restaurant.menus.length}</Text>
              </View>
              {restaurant.menus.length ? restaurant.menus.map((menu) => (
                <View key={menu.id} style={styles.menuRow}>
                  <Text style={styles.menuName}>{menu.name}</Text>
                  <Text style={styles.menuPrice}>{menu.priceKrw == null ? '가격 정보 없음' : `${menu.priceKrw.toLocaleString()}원`}</Text>
                </View>
              )) : <View style={styles.menuEmpty}>
                <Text style={styles.emptyTitle}>등록된 메뉴가 아직 없어요</Text>
                <Text style={styles.emptyHint}>메뉴와 가격 정보는 준비 중이에요.</Text>
              </View>}
            </View>
            <View style={styles.card}>
              <View style={styles.sectionHeading}>
                <View style={styles.sectionIcon}><Ionicons name="navigate-outline" size={19} color="#C2410C" /></View>
                <Text style={styles.sectionTitle}>위치</Text>
              </View>
              <MapView key={restaurant.id} style={styles.miniMap} pointerEvents="none"
                scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false}
                initialRegion={{ latitude: restaurant.latitude, longitude: restaurant.longitude, latitudeDelta: 0.006, longitudeDelta: 0.006 }}>
                <Marker coordinate={{ latitude: restaurant.latitude, longitude: restaurant.longitude }} />
              </MapView>
              <Text style={styles.locationAddress}>{restaurant.address || '주소 정보가 없어요.'}</Text>
            </View>
            <ReviewSection restaurantId={restaurant.id} />
            {restaurant.sourceSnapshotDate ? <Text style={styles.source}>공공데이터 기준일 {restaurant.sourceSnapshotDate} · 영업 정보는 변경될 수 있어요.</Text> : null}
            {full ? <Text style={styles.source}>돌림판 후보는 최대 8곳까지 담을 수 있어요.</Text> : null}
          </ScrollView>
          <View style={styles.actionBar}>
            <Pressable accessibilityRole="button" accessibilityLabel={`돌림판 보기, 후보 ${candidates.length}곳`}
              onPress={() => router.push('/roulette')} style={styles.rouletteShortcut}>
              <Ionicons name="disc-outline" size={23} color="#9A3412" />
              <Text style={styles.rouletteCount}>{candidates.length}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled: full }} disabled={full}
              onPress={() => toggleCandidate({ id: restaurant.id, name: restaurant.name })}
              style={({ pressed }) => [styles.actionPrimary, pressed && styles.pressed, full && styles.disabled]}>
              <Ionicons name={selected ? 'checkmark' : 'add'} size={21} color="#FFFFFF" />
              <Text style={styles.actionText}>{selected ? '돌림판 후보에서 빼기' : '돌림판 후보에 담기'}</Text>
            </Pressable>
          </View>
        </>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF9F5' },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, justifyContent: 'space-between' },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#1F2937', fontSize: 18, fontWeight: '800' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  hero: { height: 210, borderRadius: 22, backgroundColor: '#FCE9DC', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  heroLabel: { position: 'absolute', top: 18, left: 18, color: '#9A3412', fontSize: 13, fontWeight: '800' },
  heroArtwork: { width: 154, height: 154, borderRadius: 22, overflow: 'hidden', marginTop: 22 },
  summary: { paddingHorizontal: 4, paddingTop: 22, paddingBottom: 5 },
  category: { color: '#9A3412', fontSize: 13, fontWeight: '700' },
  title: { color: '#1F2937', fontSize: 28, lineHeight: 36, fontWeight: '800', marginTop: 6 },
  addressLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 12 },
  addressText: { flex: 1, color: '#475569', fontSize: 14, lineHeight: 21 },
  favoriteError: { color: '#B91C1C', fontSize: 13, marginTop: 8 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F3E8E1', borderRadius: 18, padding: 18, marginTop: 18 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 13 },
  sectionIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FFF0E7', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: '#1F2937', fontSize: 18, fontWeight: '800' },
  sectionCount: { color: '#9A3412', fontSize: 13, fontWeight: '700', backgroundColor: '#FFF0E7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  muted: { color: '#64748B', fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  menuRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 13, borderTopWidth: 1, borderTopColor: '#F3E8E1' },
  menuName: { color: '#334155', fontSize: 16, flex: 1 },
  menuPrice: { color: '#1F2937', fontSize: 15, fontWeight: '700' },
  menuEmpty: { backgroundColor: '#FFF9F5', borderRadius: 12, padding: 18, alignItems: 'center' },
  emptyTitle: { color: '#334155', fontSize: 15, fontWeight: '700' },
  emptyHint: { color: '#64748B', fontSize: 13, marginTop: 5, textAlign: 'center' },
  miniMap: { height: 160, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  locationAddress: { color: '#334155', fontSize: 15, lineHeight: 23 },
  source: { color: '#64748B', fontSize: 13, lineHeight: 20, marginTop: 18 },
  primaryButton: { backgroundColor: '#C2410C', minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 24 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  actionBar: { backgroundColor: '#FFF9F5', borderTopWidth: 1, borderTopColor: '#EADDD3', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', gap: 10 },
  rouletteShortcut: { minWidth: 60, minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: '#D9C4B8', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  rouletteCount: { color: '#9A3412', fontSize: 14, fontWeight: '800' },
  actionPrimary: { flex: 1, minHeight: 52, borderRadius: 14, backgroundColor: '#C2410C', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8 },
  actionText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.75 },
});
