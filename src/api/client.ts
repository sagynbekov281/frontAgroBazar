const BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api';

function token() { return localStorage.getItem('ab_token'); }

async function req(path: string, opts: RequestInit = {}) {
  const t = token();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as any) };
  if (t) headers['Authorization'] = `Bearer ${t}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Ошибка');
  return data;
}

function qs(params?: Record<string, string>) {
  if (!params) return '';
  const p = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined));
  return Object.keys(p).length ? '?' + new URLSearchParams(p).toString() : '';
}

export const api = {
  register: (d: any) => req('/auth/register', { method: 'POST', body: JSON.stringify(d) }),
  login: (d: any) => req('/auth/login', { method: 'POST', body: JSON.stringify(d) }),
  me: () => req('/auth/me'),
  getUser: (id: string) => req(`/auth/user/${id}`),
  searchUsers: (q: string) => req(`/auth/search?q=${encodeURIComponent(q)}`),
  startAiChat: () => req('/chat/ai/start', { method: 'POST' }),

  getListings: (p?: Record<string, string>) => req(`/listings${qs(p)}`),
  getListing: (id: string) => req(`/listings/${id}`),
  createListing: (d: any) => req('/listings', { method: 'POST', body: JSON.stringify(d) }),
  updateListing: (id: string, d: any) => req(`/listings/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteListing: (id: string) => req(`/listings/${id}`, { method: 'DELETE' }),
  myListings: () => req('/listings/mine/all'),

  createOrder: (d: any) => req('/orders', { method: 'POST', body: JSON.stringify(d) }),
  myOrders: () => req('/orders/mine'),
  sellerOrders: () => req('/orders/seller'),

  getAnnouncements: (p?: Record<string, string>) => req(`/announcements${qs(p)}`),
  createAnnouncement: (d: any) => req('/announcements', { method: 'POST', body: JSON.stringify(d) }),
  myAnnouncements: () => req('/announcements/mine'),

  getTransport: (p?: Record<string, string>) => req(`/transport${qs(p)}`),
  createTransport: (d: any) => req('/transport', { method: 'POST', body: JSON.stringify(d) }),

  getRooms: () => req('/chat/rooms'),

  getMessages: (roomId: string) => req(`/chat/rooms/${roomId}/messages`),
  sendMessage: (roomId: string, text: string, replyTo?: string) => req(`/chat/rooms/${roomId}/messages`, { method: 'POST', body: JSON.stringify({ text, replyTo }) }),
  startChat: (userId: string) => req('/chat/start', { method: 'POST', body: JSON.stringify({ userId }) }),
  startDirectChat: (userId: string) => req('/chat/start', { method: 'POST', body: JSON.stringify({ userId }) }),
  createGroup: (name: string, userIds: string[]) => req('/chat/groups', { method: 'POST', body: JSON.stringify({ name, userIds }) }),
  addGroupMember: (roomId: string, userId: string) => req(`/chat/groups/${roomId}/members`, { method: 'POST', body: JSON.stringify({ userId }) }),
  updateGroup: (roomId: string, d: { name?: string; avatar?: string | null }) => req(`/chat/groups/${roomId}`, { method: 'PATCH', body: JSON.stringify(d) }),
  markRead: (roomId: string) => req(`/chat/rooms/${roomId}/read`, { method: 'POST' }),
  leaveGroup: (roomId: string) => req(`/chat/groups/${roomId}/leave`, { method: 'POST' }),

  deleteMessage: (roomId: string, messageId: string, mode: 'me' | 'everyone') => req(`/chat/rooms/${roomId}/messages/${messageId}?mode=${mode}`, { method: 'DELETE' }),
  deleteChat: (roomId: string) => req(`/chat/rooms/${roomId}`, { method: 'DELETE' }),
  removeGroupMember: (roomId: string, userId: string) => req(`/chat/groups/${roomId}/remove`, { method: 'POST', body: JSON.stringify({ userId }) }),
  setGroupAdmin: (roomId: string, userId: string, makeAdmin: boolean) => req(`/chat/groups/${roomId}/admins`, { method: 'POST', body: JSON.stringify({ userId, makeAdmin }) }),

  // Никнейм собеседника в личном чате (виден только тебе)
  setChatNickname: (roomId: string, nickname: string | null) => req(`/chat/rooms/${roomId}/nickname`, { method: 'PATCH', body: JSON.stringify({ nickname }) }),

  getReviews: (userId: string) => req(`/reviews/${userId}`),
  createReview: (d: any) => req('/reviews', { method: 'POST', body: JSON.stringify(d) }),

  getPrices: () => req('/prices'),

  adminStats: () => req('/admin/stats'),
  adminUsers: () => req('/admin/users'),
  adminListings: () => req('/admin/listings'),
  adminOrders: () => req('/admin/orders'),
  verifyUser: (id: string) => req(`/admin/users/${id}/verify`, { method: 'POST' }),
};