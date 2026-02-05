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

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      log(logLine);
    }
  });

  next();
});

// Error handler (NEVER throw)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err?.status || err?.statusCode || 500;
  const message = err?.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Static / Vite wiring (safe)
(async () => {
  try {
    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }
  } catch (e) {
    console.error("Static/Vite setup failed:", e);
  }
})();

// ✅ LISTEN FIRST (this is what stops rollbacks)
const port = parseInt(process.env.PORT || "5000", 10);
httpServer.listen(
  { port, host: "0.0.0.0", reusePort: true },
  () => log(`serving on port ${port}`),
);

// ✅ LOAD ROUTES AFTER LISTEN (so Plexus/DB failures can’t kill startup)
(async () => {
  try {
    await registerRoutes(httpServer, app);
    log("registerRoutes loaded", "boot");
  } catch (e) {
    console.error("registerRoutes FAILED (non-fatal):", e);
  }
})();
