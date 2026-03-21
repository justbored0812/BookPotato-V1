import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Increase request size limit for image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Session configuration (in-memory - simple and reliable on Vercel)
app.use(session({
  secret: process.env.SESSION_SECRET || 'bookshare-secret-key-for-development',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: !!process.env.VERCEL, // secure on Vercel (HTTPS), not locally
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: process.env.VERCEL ? 'none' : 'lax' // required for cross-site cookies on Vercel
  }
}));

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

// Register routes immediately
// We don't await the server object here for exports, 
// but the routes themselves are registered synchronously inside the function calls.
app.get('/marketing', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'marketing-website.html'));
});

app.get(['/downloads.html', '/downloads'], (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.sendFile(path.join(__dirname, '..', 'downloads.html'));
});

// Create a promise for the server that we can use locally
const serverPromise = registerRoutes(app);

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
  serveStatic(app);
} else {
  // In development, handle Vite setup and local port listening
  (async () => {
    const server = await serverPromise;
    await setupVite(app, server);
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      log(`serving on port ${port}`);
    });
  })();
}

export default app;
