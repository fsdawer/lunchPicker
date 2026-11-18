import { getJson, requestJson } from '../../lib/api';

export type CommunityPost = {
  id: number;
  authorId: number;
  authorDisplayName: string;
  title: string;
  body: string;
  restaurantId: number | null;
  restaurantName: string | null;
  createdAt: string;
  viewCount: number;
  commentCount: number;
};

export type PostComment = {
  id: number;
  authorId: number;
  authorDisplayName: string;
  body: string;
  createdAt: string;
};

export type CreateCommunityPost = {
  title: string;
  body: string;
  latitude: number;
  longitude: number;
  restaurantId: number | null;
};

export function getCommunityPosts(latitude: number, longitude: number, signal?: AbortSignal) {
  return getJson<CommunityPost[]>(`/api/v1/community/posts?latitude=${latitude}&longitude=${longitude}`, signal);
}

export function createCommunityPost(token: string, post: CreateCommunityPost) {
  return requestJson<CommunityPost>('/api/v1/community/posts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(post),
  });
}

export function getCommunityPost(postId: number, signal?: AbortSignal) {
  return getJson<CommunityPost>(`/api/v1/community/posts/${postId}`, signal);
}

export function recordCommunityPostView(postId: number) {
  return requestJson<CommunityPost>(`/api/v1/community/posts/${postId}/views`, { method: 'POST' });
}

export function getPostComments(postId: number, page: number, signal?: AbortSignal) {
  return getJson<PostComment[]>(`/api/v1/community/posts/${postId}/comments?page=${page}`, signal);
}

export function createPostComment(token: string, postId: number, body: string) {
  return requestJson<PostComment>(`/api/v1/community/posts/${postId}/comments`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ body }),
  });
}

export function deletePostComment(token: string, postId: number, commentId: number) {
  return requestJson<void>(`/api/v1/community/posts/${postId}/comments/${commentId}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  });
}

export function updateCommunityPost(token: string, postId: number, title: string, body: string) {
  return requestJson<CommunityPost>(`/api/v1/community/posts/${postId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title, body }),
  });
}

export function deleteCommunityPost(token: string, postId: number) {
  return requestJson<void>(`/api/v1/community/posts/${postId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}
