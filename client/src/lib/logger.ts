/**
 * 统一日志工具
 * 在生产环境自动过滤调试日志，减少性能开销和存储成本
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMeta {
  [key: string]: any;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
  }

  /**
   * 调试日志 - 仅在开发环境输出
   */
  debug(message: string, meta?: LogMeta): void {
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, meta || '');
    }
  }

  /**
   * 信息日志 - 所有环境输出
   */
  info(message: string, meta?: LogMeta): void {
    console.log(`[INFO] ${message}`, meta || '');
  }

  /**
   * 警告日志 - 所有环境输出
   */
  warn(message: string, meta?: LogMeta): void {
    console.warn(`[WARN] ${message}`, meta || '');
  }

  /**
   * 错误日志 - 所有环境输出，生产环境可接入监控服务
   */
  error(message: string, error?: Error | any, meta?: LogMeta): void {
    console.error(`[ERROR] ${message}`, error || '', meta || '');

    // 生产环境: 可接入 Sentry 等错误监控服务
    if (!this.isDevelopment && typeof window !== 'undefined') {
      // if (window.Sentry) {
      //   window.Sentry.captureException(error, { tags: meta });
      // }
    }
  }

  /**
   * 性能日志 - 仅在开发环境输出
   */
  perf(label: string, startTime: number): void {
    if (this.isDevelopment) {
      const duration = performance.now() - startTime;
      console.log(`[PERF] ${label}: ${duration.toFixed(2)}ms`);
    }
  }
}

// 导出单例
export const logger = new Logger();

// 便捷函数导出
export const { debug, info, warn, error, perf } = logger;
