import { supabase } from './supabase';

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { signal?: AbortSignal }
): Promise<Response> {
  // 获取当前 session 的 JWT token
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
    signal: options?.signal,
  });

  if (!res.ok) {
    let text = res.statusText;
    try {
      text = await res.text();
    } catch (e) {
      // 如果无法读取响应文本，使用状态文本
      console.warn('Failed to read response text:', e);
    }
    throw new Error(`${res.status}: ${text}`);
  }

  return res;
}
