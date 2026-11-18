import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/features/auth/AuthContext';
import { useArea } from '../../src/features/restaurants/AreaContext';
import { getNearbyRestaurants, type Restaurant } from '../../src/features/restaurants/api';
import { createMeetup } from '../../src/features/meetups/api';

const TIME_OPTIONS = [30, 60, 90, 120];

export default function NewMeetupScreen() {
  const { area } = useArea();
  const { getToken } = useAuth();
  const [query, setQuery] = useState('');
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [suggestions, setSuggestions] = useState<Restaurant[]>([]);
  const [minutesFromNow, setMinutesFromNow] = useState(60);
  const [capacity, setCapacity] = useState(4);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (restaurant || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      getNearbyRestaurants(area.latitude, area.longitude, 0, controller.signal, query.trim())
        .then((result) => { if (!controller.signal.aborted) setSuggestions(result.slice(0, 8)); })
        .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '식당을 검색하지 못했어요.'); });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [area, query, restaurant]);

  // 로그인 사용자의 식당·시간·정원 선택을 서버에 저장한다.
  const submit = async () => {
    if (!restaurant || saving) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        router.push('/auth?returnTo=%2Fmeetups%2Fnew' as Href);
        return;
      }
      const startsAt = new Date(Date.now() + minutesFromNow * 60_000).toISOString();
      const created = await createMeetup(token, restaurant.id, startsAt, capacity);
      router.replace({ pathname: '/meetups/[id]', params: { id: String(created.id) } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '모집을 만들지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Text>← 뒤로</Text></Pressable>
      <Text style={styles.title}>같이 먹기 모집</Text>
    </View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <Text style={styles.label}>음식점</Text>
      {restaurant ? <View style={styles.selected}><Text style={styles.selectedName}>{restaurant.name}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="선택한 식당 지우기" onPress={() => { setRestaurant(null); setQuery(''); }} style={styles.clear}><Text>지우기</Text></Pressable></View> :
        <TextInput accessibilityLabel="음식점 이름 검색" placeholder="식당 이름을 검색해 선택하세요" value={query}
          onChangeText={(value) => { setQuery(value); setError(null); }} style={styles.input} maxLength={50} />}
      {suggestions.map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => { setRestaurant(item); setSuggestions([]); }} style={styles.suggestion}>
        <Text style={styles.suggestionName}>{item.name}</Text><Text>{item.distanceMeters.toLocaleString()} m</Text>
      </Pressable>)}
      <Text style={styles.label}>식사 시간</Text>
      <Text style={styles.help}>현재 시각을 기준으로 선택해요.</Text>
      <View style={styles.options}>{TIME_OPTIONS.map((minutes) => <Pressable key={minutes} accessibilityRole="button"
        accessibilityState={{ selected: minutesFromNow === minutes }} onPress={() => setMinutesFromNow(minutes)}
        style={[styles.option, minutesFromNow === minutes && styles.activeOption]}>
        <Text style={minutesFromNow === minutes ? styles.activeText : styles.optionText}>{minutes}분 뒤</Text>
      </Pressable>)}</View>
      <Text style={styles.label}>정원</Text>
      <View style={styles.capacityRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="정원 줄이기" disabled={capacity <= 2} onPress={() => setCapacity(capacity - 1)} style={styles.capacityButton}><Text>−</Text></Pressable>
        <Text style={styles.capacityValue}>{capacity}명</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="정원 늘리기" disabled={capacity >= 8} onPress={() => setCapacity(capacity + 1)} style={styles.capacityButton}><Text>＋</Text></Pressable>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: !restaurant || saving }} disabled={!restaurant || saving}
        onPress={() => { void submit(); }} style={[styles.submit, (!restaurant || saving) && styles.disabled]}>
        {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>모집 시작하기</Text>}
      </Pressable>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF9F5' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56, paddingHorizontal: 12 },
  back: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
  title: { color: '#1F2937', fontSize: 21, fontWeight: '800' },
  content: { padding: 20, paddingBottom: 48 },
  label: { color: '#1F2937', fontSize: 17, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  input: { minHeight: 52, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7D9CE', borderRadius: 12, paddingHorizontal: 14, fontSize: 16 },
  selected: { minHeight: 52, borderRadius: 12, backgroundColor: '#FFF0E7', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  selectedName: { flex: 1, color: '#9A3412', fontWeight: '700' },
  clear: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
  suggestion: { minHeight: 48, borderBottomWidth: 1, borderColor: '#E7D9CE', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 8 },
  suggestionName: { flex: 1, color: '#1F2937' },
  help: { color: '#64748B', marginBottom: 12 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { minHeight: 48, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7D9CE', justifyContent: 'center' },
  activeOption: { backgroundColor: '#C2410C', borderColor: '#C2410C' },
  optionText: { color: '#1F2937', fontWeight: '700' },
  activeText: { color: '#FFFFFF', fontWeight: '700' },
  capacityRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  capacityButton: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#FCE7D8', alignItems: 'center', justifyContent: 'center' },
  capacityValue: { fontSize: 18, fontWeight: '700' },
  error: { color: '#B91C1C', marginTop: 16 },
  submit: { minHeight: 54, borderRadius: 13, backgroundColor: '#C2410C', alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
