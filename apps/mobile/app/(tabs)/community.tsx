import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/features/auth/AuthContext';
import { getCommunityPosts, type CommunityPost } from '../../src/features/community/api';
import { useArea } from '../../src/features/restaurants/AreaContext';

// 지역 글을 제목, 작성 정보, 조회수와 댓글 수로 한 줄에 표시한다.
function PostRow({ communityPost }: { communityPost: CommunityPost }) {
  return <Pressable accessibilityRole="button"
    accessibilityLabel={`${communityPost.title}, ${communityPost.authorDisplayName}님의 글, 댓글 ${communityPost.commentCount}개, 상세 보기`}
    onPress={() => router.push({ pathname: '/community/[id]', params: { id: String(communityPost.id) } })}
    style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
    <View style={styles.dot} />
    <View style={styles.rowText}>
      <Text style={styles.postTitle} numberOfLines={2}>{communityPost.title}</Text>
      <Text style={styles.meta} numberOfLines={1}>
        {communityPost.authorDisplayName} · {new Date(communityPost.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · 조회 {communityPost.viewCount}
      </Text>
      {communityPost.restaurantName && <View style={styles.restaurantRow}>
        <Ionicons name="location-outline" size={13} color="#9A3412" />
        <Text style={styles.restaurant} numberOfLines={1}>{communityPost.restaurantName}</Text>
      </View>}
    </View>
    <View style={styles.commentBadge}>
      <Text style={styles.commentCount}>{communityPost.commentCount}</Text>
      <Text style={styles.commentLabel}>댓글</Text>
    </View>
  </Pressable>;
}

export default function CommunityScreen() {
  const { area } = useArea();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setCommunityPosts([]);
    setLoading(true);
    setError(null);
    getCommunityPosts(area.latitude, area.longitude, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setCommunityPosts(result); })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '글을 불러오지 못했어요.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [area, attempt]));

  // 로그인 상태에 맞는 글쓰기 화면으로 이동한다.
  const openWrite = () => {
    router.push(user ? '/community/new' as Href : '/auth?returnTo=%2Fcommunity%2Fnew' as Href);
  };

  return <View style={styles.screen}>
    <Pressable accessibilityRole="button" accessibilityLabel="주변 사람과 같이 먹기 모집 보기"
      onPress={() => router.push('/meetups')} style={({ pressed }) => [styles.meetupLink, pressed && styles.pressed]}>
      <Ionicons name="people-outline" size={20} color="#9A3412" />
      <Text style={styles.meetupLinkText}>주변 사람과 같이 먹기</Text>
      <Ionicons name="chevron-forward" size={18} color="#9A3412" />
    </Pressable>
    {loading && communityPosts.length === 0 ? <ActivityIndicator style={styles.center} color="#C2410C" /> :
      error ? <View style={styles.center}>
        <Text style={styles.feedbackTitle}>글을 불러오지 못했어요</Text>
        <Text style={styles.feedbackBody}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)} style={styles.retryButton}>
          <Text style={styles.retryText}>다시 시도</Text>
        </Pressable>
      </View> :
        <FlatList data={communityPosts} keyExtractor={(item) => String(item.id)}
          refreshing={loading} onRefresh={() => setAttempt((value) => value + 1)}
          renderItem={({ item }) => <PostRow communityPost={item} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={38} color="#C2410C" />
            <Text style={styles.feedbackTitle}>아직 이 지역의 글이 없어요</Text>
            <Text style={styles.feedbackBody}>오늘의 점심 이야기를 먼저 남겨보세요.</Text>
          </View>} />}
    <Pressable accessibilityRole="button" accessibilityLabel="지역 글쓰기" onPress={openWrite}
      style={({ pressed }) => [styles.fab, { bottom: Math.max(insets.bottom, 12) + 100 }, pressed && styles.pressed]}>
      <Ionicons name="pencil" size={27} color="#FFFFFF" />
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF9F5' },
  meetupLink: { marginHorizontal: 20, marginTop: 8, marginBottom: 8, paddingHorizontal: 16, minHeight: 52, borderRadius: 14, backgroundColor: '#FFF0E7', flexDirection: 'row', alignItems: 'center', gap: 8 },
  meetupLinkText: { flex: 1, color: '#9A3412', fontSize: 15, fontWeight: '700' },
  list: { paddingHorizontal: 20, paddingBottom: 164, flexGrow: 1 },
  row: { minHeight: 86, paddingVertical: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C2410C', marginTop: 11 },
  rowText: { flex: 1, minWidth: 0 },
  postTitle: { color: '#1F2937', fontSize: 15, lineHeight: 22, fontWeight: '600' },
  meta: { color: '#64748B', fontSize: 11, marginTop: 5 },
  restaurantRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 },
  restaurant: { color: '#9A3412', fontSize: 12, flexShrink: 1 },
  commentBadge: { width: 54, minHeight: 58, backgroundColor: '#F1EAE4', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  commentCount: { color: '#1F2937', fontSize: 18, fontWeight: '800' },
  commentLabel: { color: '#64748B', fontSize: 11, marginTop: 2 },
  separator: { height: 1, backgroundColor: '#D7C7BC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 28, minHeight: 220 },
  feedbackTitle: { color: '#1F2937', fontSize: 17, fontWeight: '700', marginTop: 12, textAlign: 'center' },
  feedbackBody: { color: '#64748B', fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  retryButton: { minHeight: 48, paddingHorizontal: 20, backgroundColor: '#C2410C', borderRadius: 12, justifyContent: 'center', marginTop: 18 },
  retryText: { color: '#FFFFFF', fontWeight: '700' },
  fab: { position: 'absolute', right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#C2410C', alignItems: 'center', justifyContent: 'center', shadowColor: '#000000', shadowOpacity: 0.17, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  pressed: { opacity: 0.75 },
});
