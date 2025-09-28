import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// CORS configuration for external hosting
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow localhost and Replit URLs
    if (process.env.NODE_ENV === 'development') {
      if (origin.includes('localhost') || 
          origin.includes('127.0.0.1') || 
          origin.includes('0.0.0.0') ||
          origin.includes('.replit.') ||
          origin.includes('.repl.co')) {
        return callback(null, true);
      }
    }
    
    // In production, check against allowed origins
    const allowedOrigins = process.env.ALLOWED_ORIGIN ? 
      process.env.ALLOWED_ORIGIN.split(',').map(origin => {
        const trimmed = origin.trim();
        try {
          // If it contains protocol, extract hostname for consistency
          if (trimmed.includes('://')) {
            return new URL(trimmed).hostname;
          }
          // Otherwise treat as hostname
          return trimmed;
        } catch {
          // If URL parsing fails, treat as hostname
          return trimmed;
        }
      }) : [];
    
    // Check if the origin's hostname matches any allowed origin
    try {
      const originUrl = new URL(origin);
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        // Allow exact matches or subdomains
        return originUrl.hostname === allowedOrigin || 
               originUrl.hostname.endsWith(`.${allowedOrigin}`);
      });
      
      if (isAllowed) {
        return callback(null, true);
      }
    } catch (error) {
      // Invalid URL format
    }
    
    // Reject the request
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies to be sent with requests
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
