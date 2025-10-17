import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    configFile: path.resolve(import.meta.dirname, '../vite.config.ts'),
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "spa",
  });

  // Handle .well-known requests with proper 404 responses
  app.use('/.well-known/*', (req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  // Use Vite middleware for all non-API routes
  app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api/')) {
      return next();
    }
    vite.middlewares(req, res, next);
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
