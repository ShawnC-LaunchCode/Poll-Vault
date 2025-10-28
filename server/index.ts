import dotenv from "dotenv";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { log } from "./utils";
import { serveStatic } from "./static";

// Load environment variables from .env file
dotenv.config();

const app = express();

// Note: Session and auth setup is handled by setupAuth() in registerRoutes()
// to avoid duplicate middleware registration

// =====================================================================
// 💡 CORS CONFIGURATION
// Dynamically determines allowed origins based on environment
const corsOptions = {
    origin: function (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
    ) {
        const isDevelopment = process.env.NODE_ENV === "development";

        // Allow requests with no origin (like mobile apps or curl requests)
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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// =====================================================================
// 💡 REQUEST LOGGING MIDDLEWARE
// Logs API requests and responses with timing information
app.use((req, res, next) => {
    // Note: COOP header removed - it blocks Google OAuth window.postMessage communication
    // Google OAuth works fine with the default COOP policy (unsafe-none)

    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson: any, ...args: any[]) {
        capturedJsonResponse = bodyJson;
        // Use assertion to silence TypeScript error about spread arguments in apply
        return originalResJson.apply(res, [bodyJson, ...args] as any);
    } as any; // Cast back to any after definition

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
// =====================================================================


(async () => {
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";

        res.status(status).json({ message });
        // NOTE: Commented out 'throw err' to prevent server crash on expected errors
        // throw err; 
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
        // Dynamic import vite only in development to avoid bundling it
        try {
            const { setupVite } = await import("./vite.js");
            await setupVite(app, server);
        } catch (error) {
            console.error("Failed to load vite (this is expected in production):", error);
            // Fallback to static serving if vite module is not available
            serveStatic(app);
        }
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
