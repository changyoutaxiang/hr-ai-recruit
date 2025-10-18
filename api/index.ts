import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Express } from 'express';

// 动态导入编译后的 Express 应用（懒加载优化）
let app: Express | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 首次调用时初始化 Express 应用
  if (!app) {
    // @ts-ignore - 动态导入的编译后文件，无类型声明
    const module = await import('../dist/index.js');
    app = module.default as Express;
  }

  // Express 应用作为中间件处理请求
  return app(req, res);
}
