import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/features/auth/AuthContext';
import { useArea } from '../../src/features/restaurants/AreaContext';
import { getNearbyMeetups, type Meetup } from '../../src/features/meetups/api';
import { MeetupCard } from '../../src/features/meetups/MeetupCard';

export default function MeetupListScreen() {
  const { area } = useArea();
  const { user, getToken } = useAuth();
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    setMeetups([]);
    setLoading(true);
    setError(null);
    getToken().then((token) => getNearbyMeetups(area.latitude, area.longitude, token))
      .then((result) => { if (active) setMeetups(result); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : '모집을 불러오지 못했어요.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [area, attempt, getToken]));

  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>← 뒤로</Text></Pressable>
      <Text style={styles.title}>{area.name} 같이 먹기</Text>
      <Pressable accessibilityRole="button" onPress={() => user ? router.push('/meetups/new') : router.push('/auth?returnTo=%2Fmeetups%2Fnew' as Href)}
        style={styles.create}><Text style={styles.createText}>모집하기</Text></Pressable>
    </View>
    {loading && meetups.length === 0 ? <ActivityIndicator style={styles.center} color="#C2410C" /> :
      error ? <View style={styles.center}><Text>{error}</Text><Pressable accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)} style={styles.retry}><Text>다시 시도</Text></Pressable></View> :
        <FlatList data={meetups} keyExtractor={(item) => String(item.id)} renderItem={({ item }) => <MeetupCard meetup={item} />}
          contentContainerStyle={styles.list} onRefresh={() => setAttempt((value) => value + 1)} refreshing={loading}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyTitle}>예정된 모집이 없어요</Text><Text style={styles.emptyText}>첫 같이 먹기 약속을 만들어 보세요.</Text></View>} />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF9F5' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, minHeight: 64 },
  back: { minHeight: 48, justifyContent: 'center' },
  backText: { color: '#1F2937', fontSize: 15 },
  title: { color: '#1F2937', fontSize: 20, fontWeight: '800', flex: 1 },
  create: { backgroundColor: '#C2410C', paddingHorizontal: 14, minHeight: 44, borderRadius: 12, justifyContent: 'center' },
  createText: { color: '#FFFFFF', fontWeight: '700' },
  list: { padding: 20, paddingBottom: 40, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  retry: { marginTop: 18, backgroundColor: '#FCE7D8', padding: 14, borderRadius: 12 },
  emptyTitle: { color: '#1F2937', fontSize: 17, fontWeight: '700' },
  emptyText: { color: '#64748B', marginTop: 8 },
});
