import { requestJson } from '../../lib/api';

export type Meetup = {
  id: number;
  hostUserId: number;
  hostDisplayName: string;
  restaurantId: number;
  restaurantName: string;
  startsAt: string;
  capacity: number;
  memberCount: number;
  status: string;
  joined: boolean;
};

export type ChatMessage = {
  id: number;
  senderId: number;
  senderDisplayName: string;
  body: string;
  createdAt: string;
};

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

export function getNearbyMeetups(latitude: number, longitude: number, token?: string | null) {
  return requestJson<Meetup[]>(`/api/v1/meetups?latitude=${latitude}&longitude=${longitude}`,
    { headers: token ? authHeaders(token) : {} });
}

export function getMyMeetups(token: string) {
  return requestJson<Meetup[]>('/api/v1/meetups/mine', { headers: authHeaders(token) });
}

export function getMeetup(meetupId: number, token?: string | null) {
  return requestJson<Meetup>(`/api/v1/meetups/${meetupId}`, { headers: token ? authHeaders(token) : {} });
}

export function createMeetup(token: string, restaurantId: number, startsAt: string, capacity: number) {
  return requestJson<Meetup>('/api/v1/meetups', {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify({ restaurantId, startsAt, capacity }),
  });
}

export function joinMeetup(token: string, meetupId: number) {
  return requestJson<Meetup>(`/api/v1/meetups/${meetupId}/join`, { method: 'POST', headers: authHeaders(token) });
}

export function leaveMeetup(token: string, meetupId: number) {
  return requestJson<void>(`/api/v1/meetups/${meetupId}/join`, { method: 'DELETE', headers: authHeaders(token) });
}

export function getChatMessages(token: string, meetupId: number, afterId: number) {
  return requestJson<ChatMessage[]>(`/api/v1/meetups/${meetupId}/messages?afterId=${afterId}`,
    { headers: authHeaders(token) });
}

export function sendChatMessage(token: string, meetupId: number, body: string) {
  return requestJson<ChatMessage>(`/api/v1/meetups/${meetupId}/messages`, {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify({ body }),
  });
}
