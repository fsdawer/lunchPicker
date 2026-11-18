import { getJson, requestJson } from '../../lib/api';

export const REVIEW_PAGE_SIZE = 20;

export type Review = {
  id: number;
  authorId: number;
  authorDisplayName: string;
  rating: number;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type ReviewInput = { rating: number; body: string };

export function getReviews(restaurantId: number, page: number, signal?: AbortSignal) {
  return getJson<Review[]>(`/api/v1/restaurants/${restaurantId}/reviews?page=${page}`, signal);
}

export function createReview(restaurantId: number, token: string, input: ReviewInput) {
  return requestJson<Review>(`/api/v1/restaurants/${restaurantId}/reviews`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(input),
  });
}

export function updateReview(restaurantId: number, reviewId: number, token: string, input: ReviewInput) {
  return requestJson<Review>(`/api/v1/restaurants/${restaurantId}/reviews/${reviewId}`, {
    method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(input),
  });
}

export function deleteReview(restaurantId: number, reviewId: number, token: string) {
  return requestJson<void>(`/api/v1/restaurants/${restaurantId}/reviews/${reviewId}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  });
}
