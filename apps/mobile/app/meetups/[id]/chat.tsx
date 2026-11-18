import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { getChatMessages, sendChatMessage, type ChatMessage } from '../../../src/features/meetups/api';

export default function MeetupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const meetupId = Number(id);
  const { user, getToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const afterId = useRef(0);
  const fetching = useRef(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useFocusEffect(useCallback(() => {
    if (!Number.isSafeInteger(meetupId) || meetupId < 1) {
      setError('모집 ID가 올바르지 않아요.');
      setLoading(false);
      return;
    }
    let active = true;
    afterId.current = 0;
    setMessages([]);
    setLoading(true);
    setError(null);

    // 마지막으로 읽은 ID 이후의 메시지만 가져와 목록에 중복 없이 붙인다.
    const poll = async () => {
      if (fetching.current) return;
      fetching.current = true;
      try {
        const token = await getToken();
        if (!token) throw new Error('로그인이 필요해요.');
        const page = await getChatMessages(token, meetupId, afterId.current);
        if (active && page.length > 0) {
          afterId.current = page[page.length - 1].id;
          setMessages((current) => {
            const known = new Set(current.map((message) => message.id));
            return [...current, ...page.filter((message) => !known.has(message.id))].sort((a, b) => a.id - b.id);
          });
        }
        if (active) setError(null);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : '메시지를 불러오지 못했어요.');
      } finally {
        fetching.current = false;
        if (active) setLoading(false);
      }
    };

    void poll();
    const interval = setInterval(() => { void poll(); }, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [meetupId, attempt, getToken]));

  // 빈 내용을 막고 로그인 사용자의 메시지를 저장한다.
  const send = async () => {
    if (sending || !body.trim()) return;
    setSending(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('로그인이 필요해요.');
      const created = await sendChatMessage(token, meetupId, body.trim());
      setMessages((current) => current.some((message) => message.id === created.id) ? current : [...current, created]);
      setBody('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '메시지를 보내지 못했어요.');
    } finally {
      setSending(false);
    }
  };

  return <SafeAreaView style={styles.screen}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Text>← 뒤로</Text></Pressable>
        <Text style={styles.title}>같이 먹기 채팅</Text>
      </View>
      {loading && messages.length === 0 ? <ActivityIndicator style={styles.center} color="#C2410C" /> :
        <FlatList ref={listRef} data={messages} keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list} onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => <View style={[styles.message, item.senderId === user?.id && styles.myMessage]}>
            <Text style={styles.sender}>{item.senderDisplayName}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.time}>{new Date(item.createdAt).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}</Text>
          </View>}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.empty}>첫 메시지를 보내 보세요.</Text></View>} />}
      {error && <Pressable accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)} style={styles.errorBox}>
        <Text style={styles.error}>{error} · 다시 시도</Text>
      </Pressable>}
      <View style={styles.composer}>
        <TextInput accessibilityLabel="채팅 메시지" placeholder="메시지 입력" value={body} onChangeText={setBody}
          maxLength={1000} style={styles.input} />
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: sending || !body.trim() }} disabled={sending || !body.trim()}
          onPress={() => { void send(); }} style={[styles.send, (sending || !body.trim()) && styles.disabled]}>
          <Text style={styles.sendText}>전송</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#FFF9F5' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56, paddingHorizontal: 12 },
  back: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
  title: { color: '#1F2937', fontSize: 20, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  list: { padding: 16, flexGrow: 1 },
  message: { alignSelf: 'flex-start', maxWidth: '85%', backgroundColor: '#FFFFFF', borderRadius: 15, padding: 12, marginBottom: 12 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: '#FCE7D8' },
  sender: { color: '#9A3412', fontSize: 12, fontWeight: '700' },
  body: { color: '#1F2937', fontSize: 15, lineHeight: 22, marginTop: 4 },
  time: { color: '#64748B', fontSize: 11, marginTop: 6 },
  empty: { color: '#64748B', fontSize: 14 },
  errorBox: { padding: 12, backgroundColor: '#FEE2E2' },
  error: { color: '#B91C1C' },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: 1, borderColor: '#E7D9CE' },
  input: { flex: 1, minHeight: 48, backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, fontSize: 15 },
  send: { minWidth: 60, minHeight: 48, borderRadius: 12, backgroundColor: '#C2410C', alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#FFFFFF', fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
