import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { getMeetup, joinMeetup, leaveMeetup, type Meetup } from '../../../src/features/meetups/api';

export default function MeetupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const meetupId = Number(id);
  const { user, getToken } = useAuth();
  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(useCallback(() => {
    if (!Number.isSafeInteger(meetupId) || meetupId < 1) {
      setError('모집 ID가 올바르지 않아요.');
      setLoading(false);
      return;
    }
    let active = true;
    setMeetup(null);
    setLoading(true);
    setError(null);
    getToken().then((token) => getMeetup(meetupId, token))
      .then((result) => { if (active) setMeetup(result); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : '모집을 불러오지 못했어요.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [meetupId, attempt, getToken]));

  // 로그인 토큰으로 모집에 참여하거나 참여를 취소한다.
  const toggleJoin = async () => {
    if (!meetup || saving) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        router.push('/auth' as Href);
        return;
      }
      if (meetup.joined) {
        await leaveMeetup(token, meetupId);
        setMeetup(await getMeetup(meetupId, token));
      } else {
        setMeetup(await joinMeetup(token, meetupId));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '참여 상태를 변경하지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  const canJoin = meetup != null && new Date(meetup.startsAt).getTime() > Date.now() && meetup.memberCount < meetup.capacity;

  return <SafeAreaView style={styles.screen}>
    <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Text>← 뒤로</Text></Pressable>
    {loading && !meetup ? <ActivityIndicator style={styles.center} color="#C2410C" /> : error && !meetup ?
      <View style={styles.center}><Text style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)} style={styles.button}><Text style={styles.buttonText}>다시 시도</Text></Pressable></View> : meetup ?
        <View style={styles.content}>
          <Text style={styles.eyebrow}>같이 먹기</Text>
          <Text style={styles.title}>{meetup.restaurantName}</Text>
          <Text style={styles.meta}>시간 · {new Date(meetup.startsAt).toLocaleString('ko-KR')}</Text>
          <Text style={styles.meta}>모집자 · {meetup.hostDisplayName}</Text>
          <Text style={styles.meta}>참여 인원 · {meetup.memberCount}/{meetup.capacity}명</Text>
          {error && <Text style={styles.error}>{error}</Text>}
          {meetup.joined ? <>
            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/meetups/[id]/chat', params: { id: String(meetupId) } })} style={styles.button}>
              <Text style={styles.buttonText}>채팅방 열기</Text>
            </Pressable>
            {user?.id !== meetup.hostUserId && <Pressable accessibilityRole="button" disabled={saving} onPress={() => { void toggleJoin(); }} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>참여 취소</Text>
            </Pressable>}
          </> : <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving || !canJoin }} disabled={saving || !canJoin}
            onPress={() => { void toggleJoin(); }} style={[styles.button, !canJoin && styles.disabled]}>
            <Text style={styles.buttonText}>{canJoin ? '참여하기' : '참여할 수 없어요'}</Text>
          </Pressable>}
        </View> : null}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF9F5' },
  back: { minHeight: 48, paddingHorizontal: 20, justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { padding: 24 },
  eyebrow: { color: '#C2410C', fontSize: 14, fontWeight: '700' },
  title: { color: '#1F2937', fontSize: 26, fontWeight: '800', marginTop: 8, marginBottom: 24 },
  meta: { color: '#334155', fontSize: 16, marginBottom: 14 },
  button: { backgroundColor: '#C2410C', minHeight: 52, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  secondaryText: { color: '#B91C1C', fontWeight: '700' },
  error: { color: '#B91C1C', marginTop: 16 },
  disabled: { opacity: 0.5 },
});
