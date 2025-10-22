import type { Request, Response, NextFunction, RequestHandler } from "express";
import { storage } from "../storage";
import { createLogger } from "../logger";

const logger = createLogger({ module: 'admin-auth' });

/**
 * Middleware to check if user is authenticated and has admin role
 */
export const isAdmin: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req.session as any)?.user || (req as any).user;

    if (!user?.claims?.sub) {
      logger.warn({ ip: req.ip }, 'Admin access denied: Not authenticated');
      return res.status(401).json({
        message: "Unauthorized - You must be logged in"
      });
    }

    // Get full user details from database to check role
    const dbUser = await storage.getUser(user.claims.sub);

    if (!dbUser) {
      logger.warn({ userId: user.claims.sub }, 'Admin access denied: User not found in database');
      return res.status(401).json({
        message: "Unauthorized - User not found"
      });
    }

    if (dbUser.role !== 'admin') {
      logger.warn(
        {
          userId: dbUser.id,
          email: dbUser.email,
          role: dbUser.role
        },
        'Admin access denied: User is not an admin'
      );
      return res.status(403).json({
        message: "Forbidden - Admin access required"
      });
    }

    // Attach full user object to request for use in route handlers
    (req as any).adminUser = dbUser;

    logger.info({ userId: dbUser.id, email: dbUser.email }, 'Admin access granted');
    next();
  } catch (error) {
    logger.error({ err: error }, 'Error in admin authorization middleware');
    res.status(500).json({
      message: "Internal server error during authorization"
    });
  }
};

/**
 * Helper to check if a user has admin role (without middleware context)
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    const user = await storage.getUser(userId);
    return user?.role === 'admin';
  } catch (error) {
    logger.error({ err: error, userId }, 'Error checking admin status');
    return false;
  }
}
