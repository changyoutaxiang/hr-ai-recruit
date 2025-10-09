import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { CollaborationService } from "./websocket";
import { ensureRequiredEnv } from "./config/env";
import "./services/supabaseStorage"; // 导入以触发bucket创建

ensureRequiredEnv();

const app = express();

// Extract Supabase URL for CSP
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';

// Security middleware - 添加基础 HTTP 安全头
// 配置 CSP 以支持 Vite HMR 和必要的外部资源
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        ...(process.env.NODE_ENV === 'development' ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com", // Google Fonts
      ],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: [
        "'self'",
        ...(supabaseUrl ? [supabaseUrl] : []), // Dynamic Supabase API
        "https://openrouter.ai", // OpenRouter API
        ...(process.env.NODE_ENV === 'development' ? [
          "ws://localhost:*",
          "http://localhost:*",
          "ws://127.0.0.1:*",
          "http://127.0.0.1:*"
        ] : []),
      ],
      fontSrc: [
        "'self'",
        "data:",
        "https://fonts.gstatic.com", // Google Fonts
      ],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      manifestSrc: ["'self'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
    },
  },
  crossOriginEmbedderPolicy: false, // 允许跨域资源
}));

// Rate limiting - 防止 API 滥用
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 500, // 增加到 500 次请求，防止正常使用时触发限制
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // 返回 RateLimit-* 响应头
  legacyHeaders: false, // 禁用 X-RateLimit-* 响应头
});

// 为 AI 端点设置更严格的限流（防止 Token 滥用）
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 30, // 每个 IP 最多 30 次 AI 请求
  message: 'Too many AI requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// 应用限流到所有 API 路由
app.use('/api/', apiLimiter);
app.use('/api/ai/', aiLimiter); // AI 端点使用更严格的限制

// CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim());

    // 生产环境必须配置 CORS_ORIGIN
    if (process.env.NODE_ENV === 'production' && !allowedOrigins) {
      console.error('[CORS] CRITICAL: CORS_ORIGIN not configured in production!');
      return callback(new Error('CORS configuration missing in production'));
    }

    // 开发环境默认值（包括端口 3000, 3001, 5173, 5174）
    const defaultOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:5174'];
    const finalOrigins = allowedOrigins || defaultOrigins;

    // 生产环境拒绝无 origin 的请求
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        console.warn('[CORS] Blocked request with no origin in production');
        return callback(new Error('Origin required in production'));
      }
      return callback(null, true); // 开发环境允许（Postman/curl）
    }

    if (finalOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Initialize server
(async () => {
  // Register routes
  await registerRoutes(app);

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";

    if (!res.headersSent) {
      res.status(status).json({ message });
    } else {
      res.end();
    }

    console.error('[Express] Unhandled error:', err);
  });

  // Check if running in Vercel serverless environment
  const isVercel = process.env.VERCEL === '1';

  if (!isVercel) {
    // Standard Node.js Environment (Development/Traditional Deployment)
    console.log('[Server] Running in standard Node.js mode');

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize WebSocket collaboration service
    const collaborationService = new CollaborationService(httpServer);

    // Make collaboration service available to routes
    app.set('collaborationService', collaborationService);

    // In development, we run Vite separately
    // In production, serve static files
    if (app.get("env") !== "development") {
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Default to 3000 (avoiding macOS AirPlay on 5000)
    // this serves both the API and the client.
    const port = parseInt(process.env.PORT || '3000', 10);
    httpServer.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
      log(`WebSocket collaboration service running`);
    });
  } else {
    // Vercel Serverless Environment
    console.log('[Server] Running in Vercel serverless mode - WebSocket features disabled');
  }
})();

// Export app for Vercel serverless functions
export default app;
