/**
 * TypeScript declarations for Express extensions
 * Augments Express types with custom properties used throughout the application
 */

import "express-session";

declare global {
  namespace Express {
    /**
     * User object attached to request after authentication
     */
    interface User {
      claims: {
        sub: string;
        email: string;
        name?: string;
        picture?: string;
        given_name?: string;
        family_name?: string;
        exp?: number;
        [key: string]: any;
      };
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    }

    /**
     * Augment Request interface to include user
     */
    interface Request {
      user?: User;
    }
  }
}

declare module "express-session" {
  interface SessionData {
    user?: Express.User;
  }
}
