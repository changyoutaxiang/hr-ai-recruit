/**
 * Vercel Serverless Entry Point
 *
 * 这个文件被编译为 dist/server.js，供 Vercel serverless function 使用
 * 直接导入 server/app.ts 并导出 Express 应用
 */

import { createApp } from './app';

// 创建并导出 Express 应用（懒加载）
let appPromise: Promise<any> | null = null;

export default async function handler(req: any, res: any) {
  // 首次调用时初始化应用
  if (!appPromise) {
    console.log('[Vercel Handler] Initializing Express app...');
    appPromise = createApp();
  }

  try {
    const app = await appPromise;
    return app(req, res);
  } catch (error: any) {
    console.error('[Vercel Handler] Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
