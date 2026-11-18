import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View, type ViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/features/auth/AuthContext';
import {
  createPostComment, deleteCommunityPost, deletePostComment, getCommunityPost, getPostComments,
  recordCommunityPostView, updateCommunityPost, type CommunityPost, type PostComment,
} from '../../src/features/community/api';

const COMMENT_PAGE_SIZE = 20;

export default function CommunityPostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = Number(id);
  const { user, getToken } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const viewedPostId = useRef<number | null>(null);
  const actionMenuAnchor = useRef<ViewInstance>(null);
  const [communityPost, setCommunityPost] = useState<CommunityPost | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [editing, setEditing] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [actionMenuPosition, setActionMenuPosition] = useState({ top: 0, right: 20 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsLoadingMore, setCommentsLoadingMore] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentPage, setCommentPage] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [commentAttempt, setCommentAttempt] = useState(0);
  const [commentSaving, setCommentSaving] = useState(false);

  useEffect(() => {
    if (!Number.isSafeInteger(postId) || postId < 1) {
      setError('글 ID가 올바르지 않아요.');
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setCommunityPost(null);
    setLoading(true);
    setError(null);
    const request = viewedPostId.current === postId
      ? getCommunityPost(postId, controller.signal) : recordCommunityPostView(postId);
    request.then((result) => {
      if (!controller.signal.aborted) {
        viewedPostId.current = postId;
        setCommunityPost(result);
        setTitle(result.title);
        setBody(result.body);
      }
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '글을 불러오지 못했어요.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [postId, attempt]);

  useEffect(() => {
    if (!Number.isSafeInteger(postId) || postId < 1) return;
    const controller = new AbortController();
    setComments([]);
    setCommentsLoading(true);
    setCommentsError(null);
    setCommentPage(0);
    setHasMoreComments(false);
    getPostComments(postId, 0, controller.signal)
      .then((page) => {
        if (!controller.signal.aborted) {
          setComments(page);
          setHasMoreComments(page.length === COMMENT_PAGE_SIZE);
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setCommentsError(cause instanceof Error ? cause.message : '댓글을 불러오지 못했어요.');
      })
      .finally(() => { if (!controller.signal.aborted) setCommentsLoading(false); });
    return () => controller.abort();
  }, [postId, commentAttempt]);

  // 댓글 목록의 다음 20개를 불러와 중복 없이 붙인다.
  const loadMoreComments = async () => {
    if (commentsLoadingMore || !hasMoreComments) return;
    setCommentsLoadingMore(true);
    setCommentsError(null);
    try {
      const page = await getPostComments(postId, commentPage + 1);
      setComments((current) => {
        const known = new Set(current.map((comment) => comment.id));
        return [...current, ...page.filter((comment) => !known.has(comment.id))];
      });
      setCommentPage(commentPage + 1);
      setHasMoreComments(page.length === COMMENT_PAGE_SIZE);
    } catch (cause) {
      setCommentsError(cause instanceof Error ? cause.message : '댓글을 더 불러오지 못했어요.');
    } finally {
      setCommentsLoadingMore(false);
    }
  };

  // 변경한 글 내용을 로그인 토큰과 함께 보내고 화면을 갱신한다.
  const save = async () => {
    if (saving || !title.trim() || !body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('로그인이 필요해요.');
      const updated = await updateCommunityPost(token, postId, title.trim(), body.trim());
      setCommunityPost(updated);
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '글을 수정하지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  // 삭제를 확인한 뒤 글을 지우고 목록으로 돌아간다.
  const remove = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('로그인이 필요해요.');
      await deleteCommunityPost(token, postId);
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '글을 삭제하지 못했어요.');
      setSaving(false);
    }
  };

  // 실수로 글을 지우지 않도록 확인창을 보여준다.
  const confirmDelete = () => {
    Alert.alert('글 삭제', '이 글과 댓글을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => { void remove(); } },
    ]);
  };

  // 로그인 사용자 이름으로 새 댓글을 보내고 첫 페이지를 새로 읽는다.
  const submitComment = async () => {
    if (commentSaving || !commentDraft.trim()) return;
    setCommentSaving(true);
    setCommentsError(null);
    try {
      const token = await getToken();
      if (!token) {
        router.push('/auth');
        return;
      }
      await createPostComment(token, postId, commentDraft.trim());
      setCommentDraft('');
      setCommunityPost((current) => current ? { ...current, commentCount: current.commentCount + 1 } : current);
      setCommentAttempt((value) => value + 1);
    } catch (cause) {
      setCommentsError(cause instanceof Error ? cause.message : '댓글을 올리지 못했어요.');
    } finally {
      setCommentSaving(false);
    }
  };

  // 댓글 작성자에게 삭제 여부를 확인하고 삭제 후 목록을 새로 읽는다.
  const confirmCommentDelete = (commentId: number) => {
    Alert.alert('댓글 삭제', '이 댓글을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => { void removeComment(commentId); } },
    ]);
  };

  // 작성자 토큰으로 댓글을 삭제한다.
  const removeComment = async (commentId: number) => {
    try {
      const token = await getToken();
      if (!token) throw new Error('로그인이 필요해요.');
      await deletePostComment(token, postId, commentId);
      setCommunityPost((current) => current ? { ...current, commentCount: Math.max(0, current.commentCount - 1) } : current);
      setCommentAttempt((value) => value + 1);
    } catch (cause) {
      setCommentsError(cause instanceof Error ? cause.message : '댓글을 삭제하지 못했어요.');
    }
  };

  const isAuthor = communityPost != null && user?.id === communityPost.authorId;

  // 점 세 개 버튼의 화면 좌표를 재서 내용 위에 메뉴를 겹쳐 띄운다.
  const toggleActionMenu = () => {
    if (actionMenuOpen) {
      setActionMenuOpen(false);
      return;
    }
    actionMenuAnchor.current?.measureInWindow((x, y, width, height) => {
      setActionMenuPosition({ top: y + height + 4, right: Math.max(12, windowWidth - x - width) });
      setActionMenuOpen(true);
    });
  };

  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="뒤로 가기" onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#1F2937" />
      </Pressable>
      <Text style={styles.headerTitle}>지역 글</Text>
    </View>
    {loading ? <ActivityIndicator style={styles.center} color="#C2410C" /> :
      error && !communityPost ? <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)} style={styles.primaryButton}>
          <Text style={styles.primaryText}>다시 시도</Text>
        </Pressable>
      </View> : communityPost ? <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.authorRow}>
            {editing ? <TextInput accessibilityLabel="글 제목 수정" maxLength={100} value={title}
              onChangeText={setTitle} style={styles.titleInput} /> : <Text style={styles.postTitle}>{communityPost.title}</Text>}
            {isAuthor && !editing && <Pressable ref={actionMenuAnchor} accessibilityRole="button" accessibilityLabel="글 관리 메뉴"
              accessibilityState={{ expanded: actionMenuOpen }} onPress={toggleActionMenu}
              style={({ pressed }) => [styles.menuTrigger, pressed && styles.pressed]}>
              <Ionicons name="ellipsis-vertical" size={22} color="#1F2937" />
            </Pressable>}
          </View>
          <Text style={styles.date}>
            {new Date(communityPost.createdAt).toLocaleString('ko-KR')} · 조회 {communityPost.viewCount}
          </Text>
          <Text style={styles.author}>{communityPost.authorDisplayName}</Text>
          {editing ? <>
            <TextInput accessibilityLabel="글 내용 수정" multiline maxLength={1000} value={body} onChangeText={setBody}
              textAlignVertical="top" style={styles.bodyInput} />
            <Text style={styles.count}>{body.length} / 1000</Text>
          </> : <Text style={styles.body}>{communityPost.body}</Text>}
          {communityPost.restaurantId != null && <Pressable accessibilityRole="button"
            accessibilityLabel={`${communityPost.restaurantName} 식당 상세 보기`}
            onPress={() => router.push({ pathname: '/restaurants/[id]', params: { id: String(communityPost.restaurantId) } })}
            style={styles.restaurant}>
            <Ionicons name="location-outline" size={20} color="#9A3412" />
            <Text numberOfLines={1} style={styles.restaurantName}>{communityPost.restaurantName}</Text>
            <Ionicons name="chevron-forward" size={18} color="#9A3412" />
          </Pressable>}
          {error && <Text style={styles.error}>{error}</Text>}
          {isAuthor && editing && <View style={styles.actions}>
              <Pressable accessibilityRole="button" onPress={() => { setTitle(communityPost.title); setBody(communityPost.body); setEditing(false); setError(null); }}
                style={styles.secondaryButton}><Text style={styles.secondaryText}>취소</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving || !title.trim() || !body.trim() }}
                disabled={saving || !title.trim() || !body.trim()} onPress={() => { void save(); }} style={styles.primaryButton}>
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>저장</Text>}
              </Pressable>
          </View>}
          <View style={styles.commentsHeader}>
            <Text style={styles.commentsTitle}>댓글 {communityPost.commentCount}</Text>
          </View>
          {commentsLoading ? <ActivityIndicator color="#C2410C" style={styles.commentsLoading} /> :
            commentsError && comments.length === 0 ? <Pressable accessibilityRole="button" onPress={() => setCommentAttempt((value) => value + 1)}>
              <Text style={styles.error}>{commentsError} · 다시 시도</Text>
            </Pressable> : comments.length === 0 ? <Text style={styles.emptyComments}>첫 댓글을 남겨 보세요.</Text> :
              comments.map((comment) => <View key={comment.id} style={styles.commentRow}>
                <View style={styles.commentTop}>
                  <Text style={styles.commentAuthor}>{comment.authorDisplayName}</Text>
                  <Text style={styles.commentDate}>{new Date(comment.createdAt).toLocaleString('ko-KR')}</Text>
                  {user?.id === comment.authorId && <Pressable accessibilityRole="button" accessibilityLabel="내 댓글 삭제"
                    onPress={() => confirmCommentDelete(comment.id)} style={styles.commentDelete}>
                    <Text style={styles.deleteText}>삭제</Text>
                  </Pressable>}
                </View>
                <Text style={styles.commentBody}>{comment.body}</Text>
              </View>)}
          {commentsError && comments.length > 0 && <Text style={styles.error}>{commentsError}</Text>}
          {hasMoreComments && !commentsLoading && <Pressable accessibilityRole="button" disabled={commentsLoadingMore}
            onPress={() => { void loadMoreComments(); }} style={styles.moreButton}>
            {commentsLoadingMore ? <ActivityIndicator color="#9A3412" /> : <Text style={styles.moreText}>댓글 더 보기</Text>}
          </Pressable>}
        </ScrollView>
        <View style={styles.composer}>
          <TextInput accessibilityLabel="댓글 입력" placeholder="댓글을 남겨 보세요" value={commentDraft}
            onChangeText={setCommentDraft} maxLength={1000} style={styles.commentInput} />
          <Pressable accessibilityRole="button" accessibilityLabel="댓글 등록" disabled={commentSaving || !commentDraft.trim()}
            onPress={() => { void submitComment(); }} style={[styles.sendButton, (commentSaving || !commentDraft.trim()) && styles.disabled]}>
            {commentSaving ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="arrow-up" size={22} color="#FFFFFF" />}
          </Pressable>
        </View>
      </KeyboardAvoidingView> : null}
    <Modal transparent animationType="fade" visible={actionMenuOpen && isAuthor && !editing}
      statusBarTranslucent onRequestClose={() => setActionMenuOpen(false)}>
      <View style={styles.menuOverlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="글 관리 메뉴 닫기"
          style={StyleSheet.absoluteFill} onPress={() => setActionMenuOpen(false)} />
        <View style={[styles.actionMenu, actionMenuPosition]}>
          <Pressable accessibilityRole="button" accessibilityLabel="글 수정"
            onPress={() => { setActionMenuOpen(false); setEditing(true); }}
            style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}>
            <Ionicons name="create-outline" size={19} color="#1F2937" />
            <Text style={styles.menuText}>수정</Text>
          </Pressable>
          <View style={styles.menuDivider} />
          <Pressable accessibilityRole="button" accessibilityLabel="글 삭제" disabled={saving}
            onPress={() => { setActionMenuOpen(false); confirmDelete(); }}
            style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}>
            <Ionicons name="trash-outline" size={19} color="#B91C1C" />
            <Text style={styles.deleteText}>삭제</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#FFF9F5' },
  header: { height: 56, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  backButton: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#1F2937', fontSize: 21, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { padding: 20, paddingBottom: 48 },
  authorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 48 },
  author: { color: '#64748B', fontSize: 13, marginTop: 4 },
  menuTrigger: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  menuOverlay: { flex: 1 },
  actionMenu: { position: 'absolute', width: 144, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E7D9CE', shadowColor: '#000000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  menuItem: { minHeight: 48, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuDivider: { height: 1, backgroundColor: '#EDE3DC' },
  menuText: { color: '#1F2937', fontSize: 15, fontWeight: '600' },
  date: { color: '#64748B', fontSize: 13, marginTop: 4 },
  postTitle: { flex: 1, color: '#1F2937', fontSize: 22, lineHeight: 30, fontWeight: '800' },
  titleInput: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7D9CE', borderRadius: 13, minHeight: 52, paddingHorizontal: 16, color: '#1F2937', fontSize: 17 },
  body: { color: '#1F2937', fontSize: 17, lineHeight: 26, marginTop: 18 },
  bodyInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7D9CE', borderRadius: 16, minHeight: 170, padding: 16, color: '#1F2937', fontSize: 16, lineHeight: 23, marginTop: 18 },
  count: { alignSelf: 'flex-end', color: '#64748B', fontSize: 12, marginTop: 7 },
  restaurant: { backgroundColor: '#FFF1E8', minHeight: 52, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24 },
  restaurantName: { flex: 1, color: '#9A3412', fontWeight: '700' },
  error: { color: '#B91C1C', fontSize: 14, marginTop: 18 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  primaryButton: { minHeight: 48, minWidth: 88, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#C2410C', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryButton: { minHeight: 48, minWidth: 88, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#FCE7D8', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#9A3412', fontSize: 15, fontWeight: '700' },
  deleteText: { color: '#B91C1C', fontSize: 13, fontWeight: '700' },
  commentsHeader: { borderTopWidth: 1, borderColor: '#EDE3DC', paddingTop: 24, marginTop: 32 },
  commentsTitle: { color: '#1F2937', fontSize: 19, fontWeight: '800' },
  commentsLoading: { marginTop: 28 },
  emptyComments: { color: '#64748B', fontSize: 14, marginTop: 24 },
  commentRow: { paddingVertical: 18, borderBottomWidth: 1, borderColor: '#EDE3DC' },
  commentTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentAuthor: { color: '#1F2937', fontSize: 14, fontWeight: '700' },
  commentDate: { color: '#64748B', fontSize: 12, flex: 1 },
  commentDelete: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  commentBody: { color: '#1F2937', fontSize: 15, lineHeight: 23, marginTop: 6 },
  moreButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  moreText: { color: '#9A3412', fontWeight: '700' },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#FFF9F5', borderTopWidth: 1, borderColor: '#EDE3DC' },
  commentInput: { flex: 1, minHeight: 48, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7D9CE', borderRadius: 14, paddingHorizontal: 14, fontSize: 15, color: '#1F2937' },
  sendButton: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#C2410C', alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
});
