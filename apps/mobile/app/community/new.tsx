import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/features/auth/AuthContext';
import { createCommunityPost } from '../../src/features/community/api';
import { useArea } from '../../src/features/restaurants/AreaContext';
import { getNearbyRestaurants, type Restaurant } from '../../src/features/restaurants/api';

export default function NewCommunityPostScreen() {
  const { area } = useArea();
  const { user, getToken } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [suggestions, setSuggestions] = useState<Restaurant[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (selected || query.trim().length < 2) {
      setSuggestions([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    setSearchError(null);
    const timer = setTimeout(() => {
      getNearbyRestaurants(area.latitude, area.longitude, 0, controller.signal, query.trim())
        .then((restaurants) => { if (!controller.signal.aborted) setSuggestions(restaurants.slice(0, 8)); })
        .catch((cause: unknown) => {
          if (!controller.signal.aborted) setSearchError(cause instanceof Error ? cause.message : '식당을 검색하지 못했어요.');
        })
        .finally(() => { if (!controller.signal.aborted) setSearching(false); });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [area, query, selected, searchAttempt]);

  const submit = async () => {
    if (saving || !title.trim() || !body.trim()) return;
    setSaving(true);
    setSubmitError(null);
    try {
      const token = await getToken();
      if (!token || !user) {
        setSubmitError('글을 올리려면 로그인해 주세요.');
        router.push('/auth' as Href);
        return;
      }
      await createCommunityPost(token, {
        title: title.trim(),
        body: body.trim(), latitude: area.latitude, longitude: area.longitude,
        restaurantId: selected?.id ?? null,
      });
      router.back();
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : '글을 올리지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="뒤로 가기" onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </Pressable>
          <Text style={styles.headerTitle}>글쓰기</Text>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.areaNote}>
            <Ionicons name="location-outline" size={20} color="#9A3412" />
            <Text style={styles.areaText}>{area.name} 주변 3 km에 보여요</Text>
          </View>
          <Text style={styles.label}>제목</Text>
          <TextInput accessibilityLabel="글 제목" placeholder="제목을 입력해 주세요"
            placeholderTextColor="#94A3B8" maxLength={100} value={title} onChangeText={setTitle}
            style={styles.titleInput} />
          <Text style={styles.label}>오늘의 점심 이야기</Text>
          <TextInput accessibilityLabel="글 내용" placeholder="오늘 점심 어디서 먹어요?"
            placeholderTextColor="#94A3B8" multiline maxLength={1000} value={body} onChangeText={setBody}
            textAlignVertical="top" style={styles.bodyInput} />
          <Text style={styles.count}>{body.length} / 1000</Text>
          <Text style={styles.label}>음식점 위치 <Text style={styles.optional}>선택 사항</Text></Text>
          <Text style={styles.help}>식당을 고르면 글에서 위치와 상세 정보를 볼 수 있어요.</Text>
          {selected ? (
            <View style={styles.selectedRestaurant}>
              <Ionicons name="restaurant-outline" size={22} color="#9A3412" />
              <View style={styles.selectedText}>
                <Text numberOfLines={1} style={styles.selectedName}>{selected.name}</Text>
                <Text style={styles.selectedDistance}>직선거리 {selected.distanceMeters.toLocaleString()} m</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="선택한 음식점 지우기"
                onPress={() => { setSelected(null); setQuery(''); }} style={styles.clearButton}>
                <Ionicons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={21} color="#64748B" />
                <TextInput accessibilityLabel="음식점 이름 검색" placeholder="음식점 이름 검색"
                  placeholderTextColor="#94A3B8" value={query} onChangeText={setQuery}
                  autoCorrect={false} maxLength={50} style={styles.searchInput} />
              </View>
              {searching && <ActivityIndicator style={styles.searchLoading} color="#C2410C" />}
              {searchError && <Pressable accessibilityRole="button" onPress={() => setSearchAttempt((value) => value + 1)} style={styles.searchFeedback}>
                <Text style={styles.error}>{searchError} · 다시 시도</Text>
              </Pressable>}
              {!searching && !searchError && query.trim().length >= 2 && suggestions.length === 0 &&
                <Text style={styles.searchFeedback}>검색 결과가 없어요. 식당 없이 글을 올릴 수 있어요.</Text>}
              {suggestions.map((restaurant) => (
                <Pressable key={restaurant.id} accessibilityRole="button"
                  accessibilityLabel={`${restaurant.name}, 직선거리 ${restaurant.distanceMeters.toLocaleString()}미터 선택`}
                  onPress={() => { setSelected(restaurant); setQuery(restaurant.name); setSuggestions([]); }}
                  style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}>
                  <Ionicons name="restaurant-outline" size={19} color="#C2410C" />
                  <Text numberOfLines={1} style={styles.suggestionName}>{restaurant.name}</Text>
                  <Text style={styles.suggestionDistance}>{restaurant.distanceMeters.toLocaleString()} m</Text>
                </Pressable>
              ))}
            </>
          )}
          {submitError && <Text style={styles.error}>{submitError}</Text>}
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving || !title.trim() || !body.trim() }}
            disabled={saving || !title.trim() || !body.trim()} onPress={submit}
            style={({ pressed }) => [styles.submitButton, (saving || !title.trim() || !body.trim()) && styles.disabled, pressed && styles.pressed]}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>글 올리기</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#FFF9F5' },
  header: { height: 56, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  backButton: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#1F2937', fontSize: 21, fontWeight: '800' },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, flexGrow: 1 },
  areaNote: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#FFF0E7', padding: 13, borderRadius: 12, marginBottom: 24 },
  areaText: { color: '#9A3412', fontSize: 14, fontWeight: '700' },
  label: { color: '#1F2937', fontSize: 16, fontWeight: '700', marginBottom: 10 },
  titleInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7D9CE', borderRadius: 13, minHeight: 52, paddingHorizontal: 16, color: '#1F2937', fontSize: 16, marginBottom: 24 },
  optional: { color: '#64748B', fontSize: 13, fontWeight: '400' },
  help: { color: '#64748B', fontSize: 13, marginBottom: 12, lineHeight: 19 },
  bodyInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7D9CE', borderRadius: 16, minHeight: 170, padding: 16, color: '#1F2937', fontSize: 16, lineHeight: 23 },
  count: { alignSelf: 'flex-end', color: '#64748B', fontSize: 12, marginTop: 7, marginBottom: 25 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, paddingHorizontal: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7D9CE', borderRadius: 13 },
  searchInput: { flex: 1, minHeight: 48, color: '#1F2937', fontSize: 15 },
  searchLoading: { marginTop: 16 },
  searchFeedback: { color: '#64748B', fontSize: 13, paddingVertical: 16 },
  suggestion: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderColor: '#EEE7E1' },
  suggestionName: { flex: 1, color: '#1F2937', fontWeight: '600', fontSize: 14 },
  suggestionDistance: { color: '#64748B', fontSize: 12 },
  selectedRestaurant: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF0E7', borderRadius: 13, minHeight: 64, paddingLeft: 14 },
  selectedText: { flex: 1 },
  selectedName: { color: '#9A3412', fontWeight: '700', fontSize: 15 },
  selectedDistance: { color: '#7C4A34', fontSize: 12, marginTop: 3 },
  clearButton: { width: 48, height: 56, justifyContent: 'center', alignItems: 'center' },
  submitButton: { minHeight: 54, borderRadius: 13, backgroundColor: '#C2410C', alignItems: 'center', justifyContent: 'center', marginTop: 30 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  error: { color: '#B91C1C', fontSize: 13, lineHeight: 19, marginTop: 14 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.75 },
});
