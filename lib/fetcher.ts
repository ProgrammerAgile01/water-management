// lib/fetcher.ts
export const jsonFetcher = (url: string) => fetch(url).then((r) => r.json());

export async function apiJson<T = any>(
  url: string,
  init?: RequestInit & { json?: any }
): Promise<T> {
  const { json, ...rest } = init || {};
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    body: json !== undefined ? JSON.stringify(json) : init?.body,
    ...rest,
  });
  const data = (await res.json()) as T;
  if (!res.ok) {
    const msg = (data as any)?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}
