import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/features/auth/AuthContext';
import { getMyMeetups, type Meetup } from '../../src/features/meetups/api';
import { MeetupCard } from '../../src/features/meetups/MeetupCard';

export default function ChatScreen() {
  const { user, getToken } = useAuth();
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(useCallback(() => {
    if (!user) { setMeetups([]); setLoading(false); return; }
    let active = true;
    setMeetups([]);
    setLoading(true);
    setError(null);
    getToken().then((token) => {
      if (!token) throw new Error('로그인이 필요해요.');
      return getMyMeetups(token);
    }).then((result) => { if (active) setMeetups(result); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : '채팅방을 불러오지 못했어요.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, getToken, attempt]));

  return <View style={styles.screen}>
    <Text style={styles.title}>내 같이 먹기</Text>
    {!user ? <View style={styles.center}><Text style={styles.message}>채팅을 보려면 로그인해 주세요.</Text>
      <Pressable accessibilityRole="button" onPress={() => router.push('/auth')} style={styles.button}><Text style={styles.buttonText}>로그인</Text></Pressable></View> :
      loading && meetups.length === 0 ? <ActivityIndicator style={styles.center} color="#C2410C" /> :
        error ? <View style={styles.center}><Text style={styles.message}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)} style={styles.button}><Text style={styles.buttonText}>다시 시도</Text></Pressable></View> :
          <FlatList data={meetups} keyExtractor={(item) => String(item.id)} renderItem={({ item }) => <MeetupCard meetup={item} openChat />}
            contentContainerStyle={styles.list} refreshing={loading} onRefresh={() => setAttempt((value) => value + 1)}
            ListEmptyComponent={<View style={styles.center}><Text style={styles.message}>참여 중인 모집이 없어요.</Text>
              <Pressable accessibilityRole="button" onPress={() => router.push('/meetups')} style={styles.button}><Text style={styles.buttonText}>모집 둘러보기</Text></Pressable></View>} />}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF9F5' },
  title: { fontSize: 23, fontWeight: '800', color: '#1F2937', padding: 20 },
  list: { paddingHorizontal: 20, paddingBottom: 132, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  message: { color: '#64748B', fontSize: 15, textAlign: 'center' },
  button: { backgroundColor: '#C2410C', borderRadius: 12, minHeight: 48, paddingHorizontal: 18, justifyContent: 'center', marginTop: 16 },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
});
