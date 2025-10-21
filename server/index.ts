import dotenv from "dotenv";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import session from 'express-session'; // ⬅️ NEW IMPORT: For session management
import connectPgSimple from 'connect-pg-simple'; // ⬅️ NEW IMPORT: Assuming PostgreSQL store
import passport from 'passport'; // ⬅️ NEW IMPORT: Assuming Passport is used for authentication
import { registerRoutes } from "./routes";
import { log } from "./utils";
import { serveStatic } from "./static";

// Load environment variables from .env file
dotenv.config();

const app = express();

// =====================================================================
// 💡 FIX 3: TRUST PROXY AND CONFIGURE SECURE SESSIONS (CRITICAL FOR RAILWAY)
// These settings fix proxy/HTTPS detection for session cookies.
app.set('trust proxy', 1); // ⬅️ NEW: Trust the Railway proxy
const PgStore = connectPgSimple(session);

const sessionConfig = {
    // Session secret MUST be set via Railway variable
    secret: process.env.SESSION_SECRET || 'a-very-insecure-default', // ⬅️ NEW ENV VAR NEEDED
    resave: false,
    saveUninitialized: false,
    store: new PgStore({
        // Assuming your DB URL is named DATABASE_URL for the session store
        conString: process.env.DATABASE_URL, 
        tableName: 'session',
        createTableIfMissing: true,
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        secure: true, // ⬅️ MUST BE TRUE for HTTPS (Railway)
        httpOnly: true,
        sameSite: 'Lax' as 'lax', // For production/cross-origin flows
    }
};

app.use(session(sessionConfig)); // ⬅️ NEW: Use Session Middleware

// ⬅️ NEW: Initialize Passport (or whatever your auth library is)
app.use(passport.initialize());
app.use(passport.session());
// =====================================================================

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
// 💡 FIX 2: OAUTH POP-UP COMMUNICATION FIX (COOP Header)
// This middleware MUST run early to apply headers to all static files.
app.use((req, res, next) => {
    // Set headers necessary for Google OAuth pop-up communication
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    // Note: COEP header removed - it's too restrictive for OAuth

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
