import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Meetup } from './api';

export function MeetupCard({ meetup, openChat = false }: { meetup: Meetup; openChat?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${meetup.restaurantName} ${openChat ? '채팅방 열기' : '같이 먹기 모집 상세 보기'}`}
      onPress={() => router.push({ pathname: openChat ? '/meetups/[id]/chat' : '/meetups/[id]', params: { id: String(meetup.id) } })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Text style={styles.date}>{new Date(meetup.startsAt).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Text>
      <Text style={styles.name}>{meetup.restaurantName}</Text>
      <View style={styles.row}>
        <Text style={styles.host}>{meetup.hostDisplayName}님 모집</Text>
        <Text style={styles.count}>{meetup.memberCount}/{meetup.capacity}명</Text>
      </View>
      {meetup.joined && <Text style={styles.joined}>참여 중</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F3E8E1', borderRadius: 18, padding: 18, marginBottom: 12 },
  date: { color: '#9A3412', fontSize: 13, fontWeight: '700' },
  name: { color: '#1F2937', fontSize: 18, fontWeight: '800', marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  host: { color: '#64748B', fontSize: 13 },
  count: { color: '#334155', fontSize: 13, fontWeight: '700' },
  joined: { color: '#C2410C', fontSize: 13, fontWeight: '700', marginTop: 8 },
  pressed: { opacity: 0.75 },
});
