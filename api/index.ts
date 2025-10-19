/**
 * Vercel Serverless Function Entry Point
 *
 * 导入预编译的 Express 应用处理器
 * dist/server.js 是由 server/vercel.ts 编译而成
 */

import handler from '../dist/server.js';

export default handler;
