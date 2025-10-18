/**
 * Vercel Serverless Function Entry Point
 *
 * 导入预编译的 Express 应用处理器
 * dist/server.js 是由 server/vercel.ts 编译而成
 */

// 直接导入编译后的 handler（Vercel 会自动包含 dist/ 目录）
export { default } from '../dist/server.js';
