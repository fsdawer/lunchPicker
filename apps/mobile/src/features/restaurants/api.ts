import { getJson, requestJson } from '../../lib/api';

export const RESTAURANT_PAGE_SIZE = 200;
export type RestaurantSort = 'default' | 'favorites' | 'popular';

export type Restaurant = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
};

export type RestaurantDetail = {
  id: number;
  name: string;
  address: string | null;
  category: string | null;
  latitude: number;
  longitude: number;
  sourceSnapshotDate: string | null;
  menus: { id: number; name: string; priceKrw: number | null }[];
};

export type MapRestaurant = { id: number; name: string; latitude: number; longitude: number };
export type MapRestaurants = { restaurants: MapRestaurant[]; truncated: boolean };

export function getNearbyRestaurants(latitude: number, longitude: number, offset: number, signal?: AbortSignal,
                                     keyword = '', maxPriceKrw = 0, minPriceKrw = 0, sort: RestaurantSort = 'default') {
  return getJson<Restaurant[]>(
    `/api/v1/restaurants?latitude=${latitude}&longitude=${longitude}&radiusMeters=3000&offset=${offset}&q=${encodeURIComponent(keyword)}&minPriceKrw=${minPriceKrw}&maxPriceKrw=${maxPriceKrw}&sort=${sort}`,
    signal,
  );
}

export function recordRestaurantView(id: number) {
  return requestJson<void>(`/api/v1/restaurants/${id}/views`, { method: 'POST' });
}

export function getRestaurantFavorite(id: number, token: string) {
  return requestJson<{ favorite: boolean }>(`/api/v1/restaurants/${id}/favorite`, {
    method: 'GET', headers: { Authorization: `Bearer ${token}` },
  });
}

export function setRestaurantFavorite(id: number, token: string, favorite: boolean) {
  return requestJson<{ favorite: boolean }>(`/api/v1/restaurants/${id}/favorite`, {
    method: favorite ? 'POST' : 'DELETE', headers: { Authorization: `Bearer ${token}` },
  });
}

export function getRestaurantDetail(id: number, signal?: AbortSignal) {
  return getJson<RestaurantDetail>(`/api/v1/restaurants/${id}`, signal);
}

export function getMapRestaurants(south: number, north: number, west: number, east: number,
                                  latitude: number, longitude: number, signal?: AbortSignal) {
  return getJson<MapRestaurants>(
    `/api/v1/restaurants/map?south=${south}&north=${north}&west=${west}&east=${east}&latitude=${latitude}&longitude=${longitude}`,
    signal,
  );
}
