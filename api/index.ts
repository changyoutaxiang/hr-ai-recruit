/**
 * Vercel Serverless Function Entry Point
 *
 * 这个文件导出一个 handler 函数，将所有请求代理到 Express 应用
 * 使用源代码导入而非编译后的文件，避免动态导入问题
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// 直接导入 Express 应用的创建函数
// 注意：不使用 dist/index.js，因为 Vercel 会自动处理 TypeScript
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 动态导入源代码（Vercel 会自动编译 TypeScript）
    const { createApp } = await import('../server/app');
    const app = await createApp();

    // 将请求代理到 Express 应用
    return app(req, res);
  } catch (error: any) {
    console.error('[Vercel Function] Failed to initialize app:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to initialize application',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
