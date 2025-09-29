/**
 * 带重试机制的 fetch 工具
 */

import { handleAPIError, handleNetworkError, reportError } from './error-handling';

export interface RetryOptions {
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 指数退避 */
  exponentialBackoff?: boolean;
  /** 可重试的状态码 */
  retryStatusCodes?: number[];
  /** 可重试的错误类型 */
  retryErrorTypes?: string[];
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 取消信号 */
  signal?: AbortSignal;
}

const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'signal'>> = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  retryStatusCodes: [408, 429, 500, 502, 503, 504],
  retryErrorTypes: ['TypeError', 'NetworkError'],
  timeout: 30000,
};

/**
 * 延迟函数
 */
const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * 检查是否应该重试
 */
const shouldRetry = (
  error: any,
  attempt: number,
  options: Required<Omit<RetryOptions, 'signal'>>
): boolean => {
  if (attempt >= options.maxRetries) {
    return false;
  }

  // 检查是否是用户取消的请求
  if (error.name === 'AbortError') {
    return false;
  }

  // 检查错误类型
  if (options.retryErrorTypes.includes(error.name)) {
    return true;
  }

  // 检查状态码
  if (error.statusCode && options.retryStatusCodes.includes(error.statusCode)) {
    return true;
  }

  // 网络错误通常可以重试
  if (error.message?.includes('fetch') || error.message?.includes('network')) {
    return true;
  }

  return false;
};

/**
 * 带重试机制的 fetch
 */
export const retryFetch = async (
  url: string,
  init?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> => {
  const options = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
  let lastError: any;

  // 创建超时控制器
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort();
  }, options.timeout);

  // 合并信号
  const combinedSignal = options.signal || timeoutController.signal;

  try {
    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        // 检查是否已被取消
        if (combinedSignal.aborted) {
          throw new Error('Request was aborted');
        }

        const response = await fetch(url, {
          ...init,
          signal: combinedSignal,
        });

        clearTimeout(timeoutId);

        // 如果响应成功，直接返回
        if (response.ok) {
          return response;
        }

        // 如果响应失败，抛出错误以便重试逻辑处理
        await handleAPIError(response);

      } catch (error) {
        lastError = error;

        // 报告错误（用于监控）
        reportError(error, `retryFetch attempt ${attempt + 1}`);

        // 检查是否应该重试
        if (!shouldRetry(error, attempt, options)) {
          throw handleNetworkError(error);
        }

        // 如果不是最后一次尝试，等待后重试
        if (attempt < options.maxRetries) {
          const delayTime = options.exponentialBackoff
            ? options.retryDelay * Math.pow(2, attempt)
            : options.retryDelay;

          console.log(`Retrying request in ${delayTime}ms (attempt ${attempt + 1}/${options.maxRetries + 1})`);
          await delay(delayTime);
        }
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }

  // 如果所有重试都失败了，抛出最后一个错误
  throw handleNetworkError(lastError);
};

/**
 * 便捷的 JSON 请求方法
 */
export const retryFetchJSON = async <T = any>(
  url: string,
  init?: RequestInit,
  retryOptions?: RetryOptions
): Promise<T> => {
  const response = await retryFetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
  }, retryOptions);

  return response.json();
};

/**
 * 便捷的 POST 请求方法
 */
export const retryPost = async <T = any>(
  url: string,
  data?: any,
  retryOptions?: RetryOptions
): Promise<T> => {
  return retryFetchJSON<T>(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  }, retryOptions);
};

/**
 * 便捷的 PUT 请求方法
 */
export const retryPut = async <T = any>(
  url: string,
  data?: any,
  retryOptions?: RetryOptions
): Promise<T> => {
  return retryFetchJSON<T>(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  }, retryOptions);
};

/**
 * 便捷的 DELETE 请求方法
 */
export const retryDelete = async <T = any>(
  url: string,
  retryOptions?: RetryOptions
): Promise<T> => {
  return retryFetchJSON<T>(url, {
    method: 'DELETE',
  }, retryOptions);
};