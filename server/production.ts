import { createServer } from "http";

import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { log } from "./utils";
import { serveStatic } from "./static";

const app = express();

// CORS configuration for external hosting
const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) {
    const isDevelopment = process.env.NODE_ENV === "development";

    // Always allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    // Extract hostname from origin
    let hostname: string;
    try {
      hostname = new URL(origin).hostname;
    } catch (e) {
      return callback(new Error("Invalid origin URL"), false);
    }

    // In development, allow localhost origins
    if (isDevelopment) {
      const allowedPatterns = [
        /^localhost$/,
        /^127\.0\.0\.1$/,
        /^0\.0\.0\.0$/,
      ];

      if (allowedPatterns.some((pattern) => pattern.test(hostname))) {
        return callback(null, true);
      }
    }

    // In production, check against ALLOWED_ORIGIN environment variable
    const allowedOrigin = process.env.ALLOWED_ORIGIN;
    if (allowedOrigin) {
      // Split by comma to support multiple origins
      const allowedHosts = allowedOrigin.split(",").map((h) => h.trim());

      if (allowedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
        return callback(null, true);
      }
    }

    // Default: deny
    callback(new Error("Not allowed by CORS"), false);
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set security headers for Google OAuth compatibility
app.use((req, res, next) => {
  // Allow popups for Google OAuth
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  // Don't set COEP header as it's too restrictive for OAuth
  next();
});

// Create HTTP server
const server = createServer(app);

(async () => {
  // Register API routes
  await registerRoutes(app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Serve static files in production
  serveStatic(app);

  // Start server
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
