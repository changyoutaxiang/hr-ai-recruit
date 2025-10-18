import type { VercelRequest, VercelResponse } from '@vercel/node';

// 动态导入编译后的 Express 应用（懒加载优化）
let app: any;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 首次调用时初始化 Express 应用
  if (!app) {
    const module = await import('../dist/index.js');
    app = module.default;
  }

  // Express 应用作为中间件处理请求
  return app(req, res);
}
