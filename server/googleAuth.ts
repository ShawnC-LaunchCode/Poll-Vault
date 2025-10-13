import { OAuth2Client, type TokenPayload } from "google-auth-library";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";

// Initialize Google OAuth2 client
let googleClient: OAuth2Client | null = null;

function getGoogleClient(): OAuth2Client {
  if (!googleClient) {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new Error("Environment variable GOOGLE_CLIENT_ID not provided");
    }
    googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return googleClient;
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  // Detect cross-origin deployment scenario
  // This occurs when ALLOWED_ORIGIN is set and differs from the current app domain
  const isCrossOrigin = process.env.NODE_ENV === 'production' && 
                       process.env.ALLOWED_ORIGIN && 
                       !process.env.ALLOWED_ORIGIN.includes('localhost') &&
                       !process.env.ALLOWED_ORIGIN.includes('127.0.0.1') &&
                       !process.env.ALLOWED_ORIGIN.includes('0.0.0.0');

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    name: 'survey-session', // Custom cookie name for additional security
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      // For cross-origin deployments, use SameSite=None to allow cross-origin cookies
      // For same-origin deployments, use SameSite=lax for CSRF protection
      sameSite: isCrossOrigin ? 'none' : 'lax',
      maxAge: sessionTtl,
      // Additional cookie settings for cross-origin scenarios
      ...(isCrossOrigin && {
        domain: undefined, // Let browser determine the correct domain
        path: '/'  // Ensure cookie is available site-wide
      })
    },
  });
}

function updateUserSession(user: any, payload: TokenPayload) {
  user.claims = {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    given_name: payload.given_name,
    family_name: payload.family_name,
    exp: payload.exp,
  };
  user.expires_at = payload.exp;
}

async function upsertUser(payload: TokenPayload) {
  try {
    await storage.upsertUser({
      id: payload.sub!,
      email: payload.email || "",
      firstName: payload.given_name || "",
      lastName: payload.family_name || "",
      profileImageUrl: payload.picture || null,
    });
  } catch (error) {
    console.error("Error upserting user during authentication:", error);
    // Re-throw the error to let the authentication flow handle it
    throw new Error("Failed to create or update user account");
  }
}

export async function verifyGoogleToken(token: string): Promise<TokenPayload> {
  try {
    const client = getGoogleClient();
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error("Invalid token payload");
    }
    
    // Check if email is verified for additional security
    if (!payload.email_verified) {
      throw new Error("Email not verified by Google");
    }
    
    return payload;
  } catch (error) {
    console.error("Google token verification failed:", error);
    throw new Error("Invalid Google token");
  }
}

// Rate limiting for authentication endpoint
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: {
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper function to validate Origin/Referer for CSRF protection
function validateOrigin(req: any): boolean {
  const origin = req.get('Origin') || req.get('Referer');
  if (!origin) return false;
  
  try {
    const originUrl = new URL(origin);
    const allowedHosts = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0'
    ];
    
    // Add ALLOWED_ORIGIN environment variable (expecting hostname-only format)
    if (process.env.ALLOWED_ORIGIN) {
      // Split by comma for multiple allowed origins and normalize to hostnames
      const allowedOrigins = process.env.ALLOWED_ORIGIN.split(',').map(origin => {
        const trimmed = origin.trim();
        try {
          // If it contains protocol, extract hostname
          if (trimmed.includes('://')) {
            return new URL(trimmed).hostname;
          }
          // Otherwise treat as hostname
          return trimmed;
        } catch {
          // If URL parsing fails, treat as hostname
          return trimmed;
        }
      });
      allowedHosts.push(...allowedOrigins);
    }
    
    // Remove falsy values and check against origin hostname
    const validHosts = allowedHosts.filter(Boolean);
    return validHosts.some(host => 
      originUrl.hostname === host || originUrl.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Google OAuth2 login route - accepts ID token from frontend
  app.post("/api/auth/google", authRateLimit, async (req, res) => {
    try {
      const { token, idToken } = req.body;
      const googleToken = token || idToken; // Accept both 'token' and 'idToken' for compatibility

      if (!googleToken) {
        return res.status(400).json({ message: "ID token is required" });
      }

      // CSRF Protection: Validate Origin/Referer
      if (!validateOrigin(req)) {
        console.warn('Authentication attempt with invalid origin:', req.get('Origin') || req.get('Referer'));
        return res.status(403).json({ message: "Invalid request origin" });
      }

      // Verify the Google ID token
      const payload = await verifyGoogleToken(googleToken);
      
      // Create user session data
      const user: any = {};
      updateUserSession(user, payload);
      
      // Upsert user in database
      await upsertUser(payload);
      
      // Session fixation protection: regenerate session before login
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration error:', err);
          return res.status(500).json({ message: "Session creation failed" });
        }
        
        // Set up the session with new session ID
        (req as any).user = user;
        (req.session as any).user = user;
        
        res.json({ 
          message: "Authentication successful", 
          user: {
            id: payload.sub,
            email: payload.email,
            firstName: payload.given_name,
            lastName: payload.family_name,
            profileImageUrl: payload.picture,
          }
        });
      });
    } catch (error) {
      console.error("Google authentication error:", error);
      res.status(401).json({ message: "Authentication failed" });
    }
  });

  // Logout route
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destruction error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie('survey-session'); // Clear the session cookie
      res.json({ message: "Logout successful" });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = (req.session as any)?.user || req.user;

  if (!user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    // Set user on request for backward compatibility
    (req as any).user = user;
    return next();
  }

  // Token has expired
  res.status(401).json({ message: "Token expired" });
};

// Helper function to get authenticated user from request
export function getAuthenticatedUser(req: any) {
  return (req.session as any)?.user || req.user;
}