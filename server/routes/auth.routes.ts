import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../googleAuth";

/**
 * Register authentication-related routes
 */
export function registerAuthRoutes(app: Express): void {
  // Development authentication helper (only for testing in development)
  if (process.env.NODE_ENV === 'development') {
    const devLoginHandler = async (req: any, res: any) => {
      try {
        // Create a test user for development
        const testUser = {
          id: "dev-user-123",
          email: "dev@example.com",
          firstName: "Dev",
          lastName: "User",
          profileImageUrl: null,
        };

        // Upsert the test user
        await storage.upsertUser(testUser);

        // Simulate authentication by setting up the session (Google auth format)
        const mockAuthUser = {
          claims: {
            sub: testUser.id,
            email: testUser.email,
            name: `${testUser.firstName} ${testUser.lastName}`,
            given_name: testUser.firstName,
            family_name: testUser.lastName,
            picture: testUser.profileImageUrl,
            exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
          },
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        };

        // Session fixation protection: regenerate session before login (same as Google auth)
        req.session.regenerate((err: any) => {
          if (err) {
            console.error('Dev login session regeneration error:', err);
            return res.status(500).json({ message: "Session creation failed" });
          }

          // Set up the session with new session ID
          (req as any).user = mockAuthUser;
          (req.session as any).user = mockAuthUser;

          // For GET requests, redirect to dashboard; for POST, return JSON
          if (req.method === 'GET') {
            res.redirect('/dashboard');
          } else {
            res.json({ message: "Development authentication successful", user: testUser });
          }
        });
      } catch (error) {
        console.error("Dev login error:", error);
        res.status(500).json({ message: "Failed to authenticate in dev mode" });
      }
    };

    // Support both GET and POST for dev login
    app.get('/api/auth/dev-login', devLoginHandler);
    app.post('/api/auth/dev-login', devLoginHandler);
  }

  // Get current authenticated user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
