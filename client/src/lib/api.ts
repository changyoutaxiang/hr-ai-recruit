import { supabase } from './supabase';

interface ApiRequestOptions {
  signal?: AbortSignal;
  timeout?: number; // 超时时间（毫秒），默认 10000ms
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: ApiRequestOptions
): Promise<Response> {
  // 设置默认超时时间（10秒）
  const timeout = options?.timeout ?? 10000;

  // 创建超时控制器
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

  try {
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

    // 合并用户提供的 signal 和超时 signal
    const combinedSignal = options?.signal
      ? AbortSignal.any([options.signal, timeoutController.signal])
      : timeoutController.signal;

    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: combinedSignal,
    });

    // 清除超时定时器
    clearTimeout(timeoutId);

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
  } catch (error: any) {
    // 清除超时定时器
    clearTimeout(timeoutId);

    // 将 AbortError 转换为友好的超时错误
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接后重试');
    }

    throw error;
  }
}
