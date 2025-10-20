import dotenv from "dotenv";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { log } from "./utils";
import { serveStatic } from "./static";

// Load environment variables from .env file
dotenv.config();

const app = express();

// =====================================================================
// 💡 FIX 1: CORS & COOKIE CONFIGURATION (Previously Implemented)
// We use a dynamically determined origin for Railway/production.
const railwayDomain = process.env.RAILWAY_STATIC_URL || `https://${process.env.RAILWAY_STATIC_DOMAIN}`;
const allowedOrigins = [
    // 1. Production/Railway URL
    railwayDomain, 
    
    // 2. Local development origins 
    'http://localhost:3000', 
    'http://127.0.0.1:3000', 
    'http://0.0.0.0:3000',
];

// Determine the final origin to use for the CORS middleware
const dynamicOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the request origin matches any allowed domain/hostname
    const isAllowed = allowedOrigins.some(allowedOrigin => origin.startsWith(allowedOrigin));

    if (isAllowed) {
        return callback(null, true);
    }
    
    // Fallback for allowing subdomains if the full domain is complex (like the Railway default)
    try {
        const originUrl = new URL(origin);
        const isRailwaySubdomain = originUrl.hostname.endsWith('.up.railway.app');
        if (isRailwaySubdomain) {
            return callback(null, true);
        }
    } catch {
        // Ignore URL parsing errors
    }
    
    callback(new Error('Not allowed by CORS'), false);
};

const corsOptions = {
    origin: dynamicOrigin,
    credentials: true, // MUST BE TRUE for session cookies to be sent
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// =====================================================================
// 💡 FIX 2: OAUTH POP-UP COMMUNICATION FIX (COOP/COEP Headers)
// MOVED TO THE TOP: This middleware MUST run early to apply headers 
// to all static files and the initial page loads.
app.use((req, res, next) => {
    // Set headers necessary for Google OAuth pop-up communication
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
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
