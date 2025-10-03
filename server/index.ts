import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { CollaborationService } from "./websocket";

const app = express();

// Security middleware - 添加基础 HTTP 安全头
app.use(helmet());

// Rate limiting - 防止 API 滥用
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个 IP 最多 100 次请求
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
    // 支持多个域名，用逗号分隔（自动清理空格）
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) ||
                          (process.env.NODE_ENV === 'production'
                            ? [] // 生产环境必须显式配置 CORS_ORIGIN
                            : ['http://localhost:5000', 'http://localhost:5173']);

    // 允许无 origin 的请求（如 Postman、curl 等）
    if (!origin || allowedOrigins.includes(origin)) {
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

(async () => {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Initialize WebSocket collaboration service
  const collaborationService = new CollaborationService(httpServer);
  
  // Make collaboration service available to routes
  app.set('collaborationService', collaborationService);
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
    log(`WebSocket collaboration service running`);
  });
})();
