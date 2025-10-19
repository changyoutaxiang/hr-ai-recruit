/**
 * Express Application Factory for Vercel Serverless Functions
 *
 * 这个文件导出一个创建 Express 应用的函数，专门用于 Vercel 环境
 * 不启动 HTTP 服务器，只返回配置好的 Express app 实例
 */

import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { ensureRequiredEnv } from "./config/env";
import "./services/supabaseStorage"; // 导入以触发bucket创建

export async function createApp() {
  // 验证环境变量
  ensureRequiredEnv();

  const app = express();
  const trustProxySetting = process.env.TRUST_PROXY ?? '1';
  const resolveTrustProxy = (value: string) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    const numeric = Number(value);
    return Number.isNaN(numeric) ? value : numeric;
  };
  app.set('trust proxy', resolveTrustProxy(trustProxySetting));

  // Extract Supabase URL for CSP
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", ...(process.env.NODE_ENV === 'development' ? ["'unsafe-inline'", "'unsafe-eval'"] : [])],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: [
          "'self'",
          ...(supabaseUrl ? [supabaseUrl] : []),
          "https://openrouter.ai",
          ...(process.env.NODE_ENV === 'development' ? [
            "ws://localhost:*",
            "http://localhost:*",
            "ws://127.0.0.1:*",
            "http://127.0.0.1:*"
          ] : []),
        ],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        manifestSrc: ["'self'"],
        mediaSrc: ["'self'"],
        workerSrc: ["'self'", "blob:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // Rate limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: 'Too many AI requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api', apiLimiter);
  app.use('/api/ai', aiLimiter);
  app.use('/api/candidates/*/resume/parse', aiLimiter);

  // CORS configuration
  const allowedOrigins = [
    'http://localhost:5000',
    'http://localhost:3000',
    'http://127.0.0.1:5000',
    'http://127.0.0.1:3000',
  ];

  if (process.env.CORS_ORIGIN) {
    const envOrigins = process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());
    allowedOrigins.push(...envOrigins);
  }

  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const finalOrigins = [...new Set(allowedOrigins)];

      if (!origin) {
        if (process.env.NODE_ENV === 'development') {
          return callback(null, true);
        }
        return callback(new Error('Origin not allowed by CORS'));
      }

      if (process.env.NODE_ENV === 'development') {
        if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
          return callback(null, true);
        }
        return callback(null, true);
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

  // Request logging middleware
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

        console.log(logLine);
      }
    });

    next();
  });

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

  console.log('[App] Express application created for Vercel serverless');

  return app;
}
