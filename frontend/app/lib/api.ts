export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://openfoodmap.onrender.com';

type OffCollection =
  | 'audit_logs'
  | 'channels'
  | 'events'
  | 'messages'
  | 'profiles'
  | 'reports'
  | 'threads'
  | 'users';

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? `Request failed with status ${response.status}`);
  }

  return data;
}

export function getOffState<T>() {
  return requestJson<T>('/api/off/state/');
}

export function getOffMessages<T>(targetType: string, targetId: string) {
  const params = new URLSearchParams({ targetId, targetType });

  return requestJson<{ messages: T[] }>(`/api/off/messages/?${params.toString()}`);
}

export async function createOffItem<T>(collection: OffCollection, item: Omit<T, 'id'> & { id?: string | number }) {
  const data = await requestJson<{ item: T }>(`/api/off/${collection}/`, {
    body: JSON.stringify(item),
    method: 'POST',
  });

  return data.item;
}

export async function updateOffItem<T extends { id: string | number }>(collection: OffCollection, item: T) {
  const data = await requestJson<{ item: T }>(`/api/off/${collection}/${item.id}/`, {
    body: JSON.stringify(item),
    method: 'PATCH',
  });

  return data.item;
}
