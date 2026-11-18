import { useCallback, useRef, useState, type ElementRef } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { RestaurantListCard } from '../../src/components/RestaurantListCard';
import { useArea } from '../../src/features/restaurants/AreaContext';
import { getNearbyRestaurants, RESTAURANT_PAGE_SIZE, type Restaurant, type RestaurantSort } from '../../src/features/restaurants/api';

const PRICE_LIMIT = 100000;
const PRICE_STEP = 1000;
const SORT_OPTIONS: { value: RestaurantSort; label: string }[] = [
  { value: 'default', label: '기본순' },
  { value: 'favorites', label: '찜 많은순' },
  { value: 'popular', label: '인기순' },
];

export default function HomeScreen() {
  const { area } = useArea();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [sort, setSort] = useState<RestaurantSort>('default');
  const [sortDraft, setSortDraft] = useState<RestaurantSort>('default');
  const [minPriceKrw, setMinPriceKrw] = useState(0);
  const [maxPriceKrw, setMaxPriceKrw] = useState(0);
  const [minDraft, setMinDraft] = useState(0);
  const [maxDraft, setMaxDraft] = useState(PRICE_LIMIT);
  const [filterOpen, setFilterOpen] = useState(false);
  const sliderRef = useRef<ElementRef<typeof View>>(null);
  const sliderBounds = useRef({ left: 0, width: 1 });
  const activeThumb = useRef<'min' | 'max'>('max');
  const pageController = useRef<AbortController | null>(null);

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setRestaurants([]);
    setHasMore(false);
    setMoreError(null);
    setLoadingMore(false);
    setLoading(true);
    setError(null);
    getNearbyRestaurants(area.latitude, area.longitude, 0, controller.signal, '', maxPriceKrw, minPriceKrw, sort)
      .then((page) => {
        if (!controller.signal.aborted) {
          setRestaurants(page);
          setHasMore(page.length === RESTAURANT_PAGE_SIZE);
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '목록을 불러오지 못했어요.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      pageController.current?.abort();
      pageController.current = null;
    };
  }, [area, attempt, minPriceKrw, maxPriceKrw, sort]));

  // 현재 지역의 다음 200개 음식점을 기존 목록 뒤에 붙인다.
  const loadMore = () => {
    if (loading || !hasMore || pageController.current) return;
    const controller = new AbortController();
    pageController.current = controller;
    setLoadingMore(true);
    setMoreError(null);
    getNearbyRestaurants(area.latitude, area.longitude, restaurants.length, controller.signal, '', maxPriceKrw, minPriceKrw, sort)
      .then((page) => {
        if (!controller.signal.aborted) {
          setRestaurants((current) => [...current, ...page]);
          setHasMore(page.length === RESTAURANT_PAGE_SIZE);
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setMoreError(cause instanceof Error ? cause.message : '다음 목록을 불러오지 못했어요.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingMore(false);
        if (pageController.current === controller) pageController.current = null;
      });
  };

  // 현재 정렬·가격 범위를 초안에 복사해 취소해도 목록 조건이 바뀌지 않게 한다.
  const openFilter = () => {
    setSortDraft(sort);
    setMinDraft(minPriceKrw);
    setMaxDraft(maxPriceKrw || PRICE_LIMIT);
    setFilterOpen(true);
  };

  // 터치 대상과 무관한 화면 좌표를 1,000원 단위로 바꾸고 손잡이를 이동한다.
  const moveSlider = (pageX: number, selecting: boolean) => {
    const { left, width } = sliderBounds.current;
    const amount = Math.round(Math.max(0, Math.min(width, pageX - left)) / width * PRICE_LIMIT / PRICE_STEP) * PRICE_STEP;
    if (selecting) activeThumb.current = minDraft === maxDraft
      ? amount >= maxDraft ? 'max' : 'min'
      : Math.abs(amount - minDraft) <= Math.abs(amount - maxDraft) ? 'min' : 'max';
    if (activeThumb.current === 'min') setMinDraft(Math.min(amount, maxDraft));
    else setMaxDraft(Math.max(amount, minDraft));
  };

  // 실제 슬라이더의 화면 위치를 측정해 손잡이 터치 좌표가 어긋나지 않게 한다.
  const measureSlider = () => {
    sliderRef.current?.measureInWindow((left, _top, width) => {
      sliderBounds.current = { left, width: Math.max(width, 1) };
    });
  };

  // 고른 정렬과 가격 범위를 함께 적용해 첫 페이지부터 다시 조회한다.
  const applyFilter = () => {
    setSort(sortDraft);
    setMinPriceKrw(minDraft === 0 && maxDraft === PRICE_LIMIT ? 0 : minDraft);
    setMaxPriceKrw(minDraft === 0 && maxDraft === PRICE_LIMIT ? 0 : maxDraft);
    setFilterOpen(false);
  };

  // 정렬과 가격 조건을 모두 기본값으로 되돌린다.
  const clearFilter = () => {
    setSort('default');
    setMinPriceKrw(0);
    setMaxPriceKrw(0);
    setFilterOpen(false);
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.screen}>
      <FlatList
        data={loading || error ? [] : restaurants}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{area.name} 주변 음식점</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="음식점 필터 설정" onPress={openFilter}
                style={({ pressed }) => [styles.filterButton, (maxPriceKrw > 0 || sort !== 'default') && styles.filterActive, pressed && styles.pressedButton]}>
                <Text style={[styles.filterText, (maxPriceKrw > 0 || sort !== 'default') && styles.filterActiveText]}>필터</Text>
              </Pressable>
            </View>
            <Pressable accessibilityRole="button" onPress={() => router.push('/roulette')}
              style={({ pressed }) => [styles.rouletteButton, pressed && styles.pressedButton]}>
              <Text style={styles.rouletteButtonText}>오늘의 메뉴 돌림판 →</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => <RestaurantListCard restaurant={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            {loading ? <ActivityIndicator color="#C2410C" /> : null}
            <Text style={styles.emptyTitle}>{loading ? '음식점을 찾고 있어요' : error ? '목록을 불러오지 못했어요' : maxPriceKrw > 0 ? '식대에 맞는 음식점이 없어요' : '등록된 음식점이 없어요'}</Text>
            <Text style={styles.emptyDescription}>{error ?? (loading ? '잠시만 기다려 주세요.' : maxPriceKrw > 0 ? '가격이 등록된 메뉴 중 식대 이하인 곳만 표시해요. 현재 메뉴 가격 정보가 없어 결과가 비어 있을 수 있어요.' : '이 지역의 음식점 정보가 등록되면 여기에 표시됩니다.')}</Text>
            {error ? <Pressable accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressedButton]}><Text style={styles.retryText}>다시 시도</Text></Pressable> : null}
            {!loading && !error && maxPriceKrw > 0 ? <Pressable accessibilityRole="button" onPress={clearFilter}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressedButton]}><Text style={styles.retryText}>전체 보기</Text></Pressable> : null}
          </View>
        }
        ListFooterComponent={hasMore && !loading && !error ? (
          <View style={styles.footer}>
            {moreError ? <Text style={styles.moreError}>{moreError}</Text> : null}
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: loadingMore }}
              disabled={loadingMore} onPress={loadMore}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressedButton, loadingMore && styles.disabledButton]}>
              {loadingMore ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.retryText}>{moreError ? '다시 시도' : '더 보기'}</Text>}
            </Pressable>
          </View>
        ) : undefined}
      />
      <Modal visible={filterOpen} animationType="slide" transparent onRequestClose={() => setFilterOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismiss} accessibilityRole="button" accessibilityLabel="필터 닫기" onPress={() => setFilterOpen(false)} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>필터</Text>
            <Text style={styles.filterSection}>정렬</Text>
            <View style={styles.sortRow}>
              {SORT_OPTIONS.map((option) => <Pressable key={option.value} accessibilityRole="radio"
                accessibilityState={{ checked: sortDraft === option.value }} onPress={() => setSortDraft(option.value)}
                style={[styles.sortOption, sortDraft === option.value && styles.sortSelected]}>
                <Text style={[styles.sortText, sortDraft === option.value && styles.sortSelectedText]}>{option.label}</Text>
              </Pressable>)}
            </View>
            <Text style={styles.filterSection}>가격대</Text>
            <Text style={styles.priceValue}>{minDraft.toLocaleString('ko-KR')}원 ~ {maxDraft.toLocaleString('ko-KR')}원</Text>
            <View ref={sliderRef} style={styles.sliderTouch} onLayout={() => measureSlider()}
              onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true}
              onResponderGrant={(event) => moveSlider(event.nativeEvent.pageX, true)}
              onResponderMove={(event) => moveSlider(event.nativeEvent.pageX, false)}>
              <View style={styles.sliderTrack} />
              <View style={[styles.sliderFill, { left: `${minDraft / PRICE_LIMIT * 100}%`, width: `${(maxDraft - minDraft) / PRICE_LIMIT * 100}%` }]} />
              <View accessible accessibilityRole="adjustable" accessibilityLabel="최저 가격"
                accessibilityValue={{ min: 0, max: maxDraft, now: minDraft }}
                accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                onAccessibilityAction={(event) => setMinDraft((current) => Math.max(0, Math.min(maxDraft, current + (event.nativeEvent.actionName === 'increment' ? PRICE_STEP : -PRICE_STEP))))}
                style={[styles.sliderThumb, { left: `${minDraft / PRICE_LIMIT * 100}%` }]} />
              <View accessible accessibilityRole="adjustable" accessibilityLabel="최고 가격"
                accessibilityValue={{ min: minDraft, max: PRICE_LIMIT, now: maxDraft }}
                accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                onAccessibilityAction={(event) => setMaxDraft((current) => Math.max(minDraft, Math.min(PRICE_LIMIT, current + (event.nativeEvent.actionName === 'increment' ? PRICE_STEP : -PRICE_STEP))))}
                style={[styles.sliderThumb, { left: `${maxDraft / PRICE_LIMIT * 100}%` }]} />
            </View>
            <View style={styles.sliderLabels}><Text style={styles.sliderLabel}>0원</Text><Text style={styles.sliderLabel}>100,000원</Text></View>
            <Text style={styles.modalDescription}>가격을 설정하면 해당 범위의 메뉴가 등록된 식당만 표시돼요.</Text>
            <View style={styles.modalActions}>
              <Pressable accessibilityRole="button" onPress={clearFilter} style={[styles.modalButton, styles.clearButton]}>
                <Text style={styles.clearButtonText}>초기화</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={applyFilter} style={[styles.modalButton, styles.applyButton]}>
                <Text style={styles.applyButtonText}>적용</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF9F5' },
  content: { padding: 24, paddingBottom: 132, flexGrow: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 20 },
  sectionTitle: { color: '#1F2937', fontSize: 20, fontWeight: '700', flexShrink: 1 },
  filterButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  filterActive: { backgroundColor: '#FFF0E5', borderColor: '#C2410C' },
  filterText: { color: '#374151', fontSize: 13, fontWeight: '700' },
  filterActiveText: { color: '#9A3412' },
  rouletteButton: { backgroundColor: '#FCE7D8', borderRadius: 14, minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 16, marginTop: 16, marginBottom: 20 },
  rouletteButtonText: { color: '#9A3412', fontSize: 15, fontWeight: '700' },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#FFFFFF', borderRadius: 16, minHeight: 180 },
  emptyTitle: { color: '#1F2937', fontSize: 17, fontWeight: '700', marginTop: 12, textAlign: 'center' },
  emptyDescription: { color: '#64748B', fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  retryButton: { backgroundColor: '#C2410C', minHeight: 48, paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center', marginTop: 16 },
  retryText: { color: '#FFFFFF', fontWeight: '700' },
  pressedButton: { opacity: 0.85 },
  disabledButton: { opacity: 0.7 },
  footer: { alignItems: 'center', paddingVertical: 20 },
  moreError: { color: '#B91C1C', fontSize: 14, textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  modalDismiss: { flex: 1 },
  modalSheet: { backgroundColor: '#FFF9F5', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44 },
  modalTitle: { color: '#1F2937', fontSize: 22, fontWeight: '800' },
  filterSection: { color: '#1F2937', fontSize: 16, fontWeight: '700', marginTop: 24 },
  sortRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  sortOption: { flex: 1, minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: '#D8CCC4', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  sortSelected: { borderColor: '#C2410C', backgroundColor: '#FFF0E5' },
  sortText: { color: '#475569', fontSize: 13, fontWeight: '600' },
  sortSelectedText: { color: '#9A3412', fontWeight: '800' },
  priceValue: { color: '#9A3412', fontSize: 18, fontWeight: '800', marginTop: 12 },
  sliderTouch: { height: 54, marginHorizontal: 10, marginTop: 14, justifyContent: 'center' },
  sliderTrack: { height: 6, borderRadius: 3, backgroundColor: '#E7D9CE' },
  sliderFill: { position: 'absolute', top: 24, height: 6, borderRadius: 3, backgroundColor: '#C2410C' },
  sliderThumb: { position: 'absolute', top: 15, width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#C2410C', marginLeft: -12 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { color: '#64748B', fontSize: 12 },
  modalDescription: { color: '#64748B', fontSize: 13, lineHeight: 19, marginTop: 18 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalButton: { flex: 1, minHeight: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  clearButton: { backgroundColor: '#E5E7EB' },
  applyButton: { backgroundColor: '#C2410C' },
  clearButtonText: { color: '#374151', fontSize: 16, fontWeight: '700' },
  applyButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
