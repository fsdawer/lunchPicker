import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RestaurantListCard } from '../src/components/RestaurantListCard';
import { useArea } from '../src/features/restaurants/AreaContext';
import { getNearbyRestaurants, RESTAURANT_PAGE_SIZE, type Restaurant } from '../src/features/restaurants/api';

export default function SearchScreen() {
  const { area } = useArea();
  const [query, setQuery] = useState('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const pageController = useRef<AbortController | null>(null);
  const keyword = query.trim();

  useEffect(() => {
    const controller = new AbortController();
    pageController.current?.abort();
    pageController.current = null;
    setRestaurants([]);
    setHasMore(false);
    setError(null);
    setMoreError(null);
    setLoadingMore(false);
    setLoading(Boolean(keyword));
    if (!keyword) return () => controller.abort();

    const timer = setTimeout(() => {
      getNearbyRestaurants(area.latitude, area.longitude, 0, controller.signal, keyword)
        .then((page) => {
          if (controller.signal.aborted) return;
          setRestaurants(page);
          setHasMore(page.length === RESTAURANT_PAGE_SIZE);
        })
        .catch((cause: unknown) => {
          if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '검색 결과를 불러오지 못했어요.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
      pageController.current?.abort();
      pageController.current = null;
    };
  }, [area, keyword, attempt]);

  const loadMore = () => {
    if (loading || !hasMore || pageController.current) return;
    const controller = new AbortController();
    pageController.current = controller;
    setLoadingMore(true);
    setMoreError(null);
    getNearbyRestaurants(area.latitude, area.longitude, restaurants.length, controller.signal, keyword)
      .then((page) => {
        if (controller.signal.aborted) return;
        setRestaurants((current) => [...current, ...page]);
        setHasMore(page.length === RESTAURANT_PAGE_SIZE);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setMoreError(cause instanceof Error ? cause.message : '다음 결과를 불러오지 못했어요.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingMore(false);
        if (pageController.current === controller) pageController.current = null;
      });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="뒤로 가기" onPress={() => router.back()}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </Pressable>
        <Text style={styles.headerTitle}>음식점 검색</Text>
      </View>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={22} color="#64748B" />
        <TextInput autoFocus accessibilityLabel="음식점 이름 검색" placeholder="음식점 이름을 입력하세요"
          placeholderTextColor="#64748B" value={query} onChangeText={setQuery} maxLength={50}
          returnKeyType="search" style={styles.input} />
        {query ? <Pressable accessibilityRole="button" accessibilityLabel="검색어 지우기" onPress={() => setQuery('')}
          style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
          <Ionicons name="close-circle" size={22} color="#64748B" />
        </Pressable> : null}
      </View>
      <Text style={styles.scope}>{area.name} 주변 3 km · 이름 검색</Text>
      <FlatList
        data={!keyword || loading || error ? [] : restaurants}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <RestaurantListCard restaurant={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            {loading ? <ActivityIndicator color="#C2410C" /> : null}
            <Text style={styles.emptyTitle}>{!keyword ? '어떤 음식점을 찾으세요?' : loading ? '검색 중이에요' : error ? '검색하지 못했어요' : '검색 결과가 없어요'}</Text>
            <Text style={styles.emptyDescription}>{error ?? (!keyword ? '식당 이름을 입력하면 이 지역의 결과를 보여드려요.' : loading ? '잠시만 기다려 주세요.' : '다른 이름으로 다시 검색해 보세요.')}</Text>
            {error ? <Pressable accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}><Text style={styles.retryText}>다시 시도</Text></Pressable> : null}
          </View>
        }
        ListFooterComponent={hasMore && !loading && !error ? (
          <View style={styles.footer}>
            {moreError ? <Text style={styles.moreError}>{moreError}</Text> : null}
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: loadingMore }} disabled={loadingMore}
              onPress={loadMore} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed, loadingMore && styles.disabled]}>
              {loadingMore ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.retryText}>{moreError ? '다시 시도' : '더 보기'}</Text>}
            </Pressable>
          </View>
        ) : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF9F5' },
  header: { minHeight: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  headerTitle: { color: '#1F2937', fontSize: 21, fontWeight: '800' },
  searchBox: { marginHorizontal: 20, marginTop: 16, minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: '#E7D9CE', backgroundColor: '#FFFFFF', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, color: '#1F2937', fontSize: 16, paddingVertical: 10 },
  clearButton: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  scope: { marginHorizontal: 24, marginTop: 14, marginBottom: 12, color: '#64748B', fontSize: 14 },
  list: { paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#FFFFFF', borderRadius: 16, minHeight: 180 },
  emptyTitle: { color: '#1F2937', fontSize: 17, fontWeight: '700', marginTop: 12, textAlign: 'center' },
  emptyDescription: { color: '#64748B', fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  retryButton: { backgroundColor: '#C2410C', minHeight: 48, paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  retryText: { color: '#FFFFFF', fontWeight: '700' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.7 },
  footer: { alignItems: 'center', paddingVertical: 20 },
  moreError: { color: '#B91C1C', fontSize: 14, textAlign: 'center' },
});
