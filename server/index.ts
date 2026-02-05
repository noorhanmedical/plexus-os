import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { serveStatic } from "./static";
import { registerRoutes } from "./routes";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// --- ALWAYS-OK HEALTH ROUTES (no Plexus, no DB, no imports that can crash) ---
app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "plexus-os-api" });
});

app.get("/api/version", (_req, res) => {
  res.status(200).json({ ok: true, stamp: "REV-" + Date.now() });
});

// Body parsers
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false }));

// Logger (safe)
function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json.bind(res);
  (res as any).json = function (bodyJson: any, ...args: any[]) {
    capturedJsonResponse = bodyJson;
    return originalResJson(bodyJson, ...args);
  };

  res.on("finish
