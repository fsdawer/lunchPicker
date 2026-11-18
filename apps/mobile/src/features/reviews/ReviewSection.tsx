import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { createReview, deleteReview, getReviews, REVIEW_PAGE_SIZE, updateReview, type Review } from './api';

export function ReviewSection({ restaurantId }: { restaurantId: number }) {
  const { user, getToken } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setReviews([]);
    setPage(0);
    getReviews(restaurantId, 0, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setReviews(result);
        setHasMore(result.length === REVIEW_PAGE_SIZE);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '리뷰를 불러오지 못했어요.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [restaurantId, refresh]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const nextPage = page + 1;
      const result = await getReviews(restaurantId, nextPage);
      setReviews((current) => [...current, ...result]);
      setPage(nextPage);
      setHasMore(result.length === REVIEW_PAGE_SIZE);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '다음 리뷰를 불러오지 못했어요.');
    } finally {
      setLoadingMore(false);
    }
  };

  const openCreate = () => {
    if (!user) { router.push('/auth' as Href); return; }
    setEditingId(null);
    setRating(5);
    setBody('');
    setActionError(null);
    setShowForm(true);
  };

  const openEdit = (review: Review) => {
    setEditingId(review.id);
    setRating(review.rating);
    setBody(review.body);
    setActionError(null);
    setShowForm(true);
  };

  const submit = async () => {
    const trimmed = body.trim();
    if (saving || !trimmed) return;
    setSaving(true);
    setActionError(null);
    try {
      const token = await getToken();
      if (!token) { router.push('/auth' as Href); return; }
      if (editingId === null) await createReview(restaurantId, token, { rating, body: trimmed });
      else await updateReview(restaurantId, editingId, token, { rating, body: trimmed });
      setShowForm(false);
      setRefresh((value) => value + 1);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : '리뷰를 저장하지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (reviewId: number) => {
    Alert.alert('리뷰 삭제', '이 리뷰를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => { void (async () => {
        try {
          const token = await getToken();
          if (!token) { router.push('/auth' as Href); return; }
          await deleteReview(restaurantId, reviewId, token);
          setActionError(null);
          setRefresh((value) => value + 1);
        } catch (cause) {
          setActionError(cause instanceof Error ? cause.message : '리뷰를 삭제하지 못했어요.');
        }
      })(); } },
    ]);
  };

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.title}>방문 리뷰</Text>
        <Pressable accessibilityRole="button" onPress={openCreate}
          style={({ pressed }) => [styles.writeButton, pressed && styles.pressed]}>
          <Ionicons name="create-outline" size={18} color="#9A3412" />
          <Text style={styles.writeText}>리뷰 쓰기</Text>
        </Pressable>
      </View>
      {showForm && <View style={styles.form}>
        <Text style={styles.formTitle}>{editingId === null ? '리뷰 작성' : '리뷰 수정'}</Text>
        <Text style={styles.label}>평점</Text>
        <View style={styles.stars}>{[1, 2, 3, 4, 5].map((value) => (
          <Pressable key={value} accessibilityRole="button" accessibilityLabel={`평점 ${value}점`}
            accessibilityState={{ selected: rating === value }} onPress={() => setRating(value)}
            style={styles.starButton}>
            <Ionicons name={value <= rating ? 'star' : 'star-outline'} size={30} color="#EA8A24" />
          </Pressable>
        ))}</View>
        <Text style={styles.label}>방문 후기</Text>
        <TextInput accessibilityLabel="리뷰 내용" placeholder="음식과 방문 경험을 알려주세요"
          placeholderTextColor="#94A3B8" multiline maxLength={1000} value={body} onChangeText={setBody}
          textAlignVertical="top" style={styles.input} />
        <Text style={styles.count}>{body.length} / 1000</Text>
        {actionError && <Text style={styles.error}>{actionError}</Text>}
        <View style={styles.formActions}>
          <Pressable accessibilityRole="button" onPress={() => setShowForm(false)} style={styles.cancelButton}><Text style={styles.cancelText}>취소</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving || !body.trim() }}
            disabled={saving || !body.trim()} onPress={submit}
            style={[styles.submitButton, (saving || !body.trim()) && styles.disabled]}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>저장</Text>}
          </Pressable>
        </View>
      </View>}
      {actionError && !showForm && <Text style={styles.error}>{actionError}</Text>}
      {loading ? <ActivityIndicator style={styles.loading} color="#C2410C" /> :
        error && reviews.length === 0 ? <View style={styles.feedback}>
          <Text style={styles.muted}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => setRefresh((value) => value + 1)} style={styles.retryButton}><Text style={styles.retryText}>다시 시도</Text></Pressable>
        </View> : reviews.length === 0 ? <Text style={styles.muted}>아직 리뷰가 없어요. 첫 후기를 남겨보세요.</Text> :
        reviews.map((review) => <View key={review.id} style={styles.review}>
          <View style={styles.reviewHead}>
            <Text style={styles.author}>{review.authorDisplayName}</Text>
            <Text style={styles.date}>{new Date(review.createdAt).toLocaleDateString('ko-KR')}</Text>
          </View>
          <Text style={styles.rating}>★ {review.rating} / 5</Text>
          <Text style={styles.body}>{review.body}</Text>
          {user?.id === review.authorId && <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel="내 리뷰 수정" onPress={() => openEdit(review)} style={styles.action}><Text style={styles.actionText}>수정</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="내 리뷰 삭제" onPress={() => remove(review.id)} style={styles.action}><Text style={styles.deleteText}>삭제</Text></Pressable>
          </View>}
        </View>)}
      {error && reviews.length > 0 && <Text style={styles.error}>{error}</Text>}
      {hasMore && !loading && <Pressable accessibilityRole="button" disabled={loadingMore} onPress={loadMore} style={styles.moreButton}>
        {loadingMore ? <ActivityIndicator color="#9A3412" /> : <Text style={styles.moreText}>리뷰 더 보기</Text>}
      </Pressable>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F3E8E1', borderRadius: 18, padding: 20 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { color: '#1F2937', fontSize: 19, fontWeight: '700' },
  writeButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#FFF0E7' },
  writeText: { color: '#9A3412', fontSize: 14, fontWeight: '700' },
  form: { marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderColor: '#F3E8E1' },
  formTitle: { color: '#1F2937', fontWeight: '700', fontSize: 17, marginBottom: 14 },
  label: { color: '#334155', fontWeight: '700', fontSize: 14, marginBottom: 6 },
  stars: { flexDirection: 'row', gap: 4, marginBottom: 18 },
  starButton: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  input: { backgroundColor: '#FFFFFF', minHeight: 120, borderWidth: 1, borderColor: '#E7D9CE', borderRadius: 12, padding: 12, color: '#1F2937', fontSize: 15, lineHeight: 22 },
  count: { color: '#64748B', fontSize: 12, alignSelf: 'flex-end', marginTop: 5 },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#D8C9BF' },
  cancelText: { color: '#334155', fontWeight: '700' },
  submitButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#C2410C' },
  submitText: { color: '#FFFFFF', fontWeight: '700' },
  disabled: { opacity: 0.5 },
  loading: { paddingVertical: 26 },
  muted: { color: '#64748B', fontSize: 14, lineHeight: 21, marginTop: 18 },
  feedback: { alignItems: 'flex-start' },
  retryButton: { minHeight: 48, justifyContent: 'center', marginTop: 8 },
  retryText: { color: '#9A3412', fontWeight: '700' },
  review: { borderTopWidth: 1, borderColor: '#F3E8E1', paddingTop: 16, marginTop: 16 },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  author: { color: '#1F2937', fontSize: 15, fontWeight: '700' },
  date: { color: '#64748B', fontSize: 12 },
  rating: { color: '#B45309', fontSize: 14, fontWeight: '700', marginTop: 7 },
  body: { color: '#334155', fontSize: 15, lineHeight: 22, marginTop: 8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6, gap: 4 },
  action: { minWidth: 52, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: '#64748B', fontWeight: '700', fontSize: 13 },
  deleteText: { color: '#B91C1C', fontWeight: '700', fontSize: 13 },
  error: { color: '#B91C1C', fontSize: 13, lineHeight: 19, marginTop: 10 },
  moreButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  moreText: { color: '#9A3412', fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
