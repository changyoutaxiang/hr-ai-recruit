/**
 * 增强的错误处理工具
 */

export interface APIError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;
}

export class EnhancedError extends Error {
  public code?: string;
  public statusCode?: number;
  public details?: any;

  constructor(message: string, code?: string, statusCode?: number, details?: any) {
    super(message);
    this.name = 'EnhancedError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * 处理 API 响应错误
 */
export const handleAPIError = async (response: Response): Promise<never> => {
  const contentType = response.headers.get("content-type");
  let errorMessage = `请求失败 (${response.status})`;
  let errorCode = response.status.toString();
  let errorDetails = null;

  try {
    if (contentType && contentType.includes("application/json")) {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
      errorCode = errorData.code || errorCode;
      errorDetails = errorData.details || errorData;
    } else {
      errorMessage = await response.text() || errorMessage;
    }
  } catch (parseError) {
    // 如果解析错误响应失败，使用默认错误消息
    console.warn('Failed to parse error response:', parseError);
  }

  throw new EnhancedError(errorMessage, errorCode, response.status, errorDetails);
};

/**
 * 处理网络错误
 */
export const handleNetworkError = (error: any): never => {
  if (error.name === 'AbortError') {
    throw new EnhancedError('请求已取消', 'REQUEST_ABORTED');
  }

  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    throw new EnhancedError('网络连接失败，请检查网络设置', 'NETWORK_ERROR');
  }

  if (error instanceof EnhancedError) {
    throw error;
  }

  throw new EnhancedError(
    error.message || '未知错误',
    'UNKNOWN_ERROR',
    undefined,
    error
  );
};

/**
 * 获取用户友好的错误消息
 */
export const getUserFriendlyErrorMessage = (error: any): string => {
  if (error instanceof EnhancedError) {
    switch (error.code) {
      case 'REQUEST_ABORTED':
        return '请求已取消';
      case 'NETWORK_ERROR':
        return '网络连接失败，请检查网络设置';
      case 'VALIDATION_ERROR':
        return '输入数据有误，请检查后重试';
      case 'PERMISSION_DENIED':
        return '权限不足，请联系管理员';
      case 'NOT_FOUND':
        return '请求的资源不存在';
      case 'SERVER_ERROR':
        return '服务器内部错误，请稍后重试';
      default:
        return error.message;
    }
  }

  if (error.name === 'AbortError') {
    return '请求已取消';
  }

  if (error.message?.includes('fetch')) {
    return '网络连接失败，请检查网络设置';
  }

  return error.message || '发生未知错误';
};

/**
 * 错误上报
 */
export const reportError = (error: any, context?: string) => {
  console.error(`Error in ${context || 'unknown context'}:`, error);

  // 在生产环境中，这里可以集成错误监控服务
  // 如 Sentry, LogRocket 等
  if (process.env.NODE_ENV === 'production') {
    // 示例：发送到错误监控服务
    // sendErrorToMonitoring(error, context);
  }
};