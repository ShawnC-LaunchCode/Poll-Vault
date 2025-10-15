import { BaseRepository, type DbTransaction } from "./BaseRepository";
import { users, type User, type UpsertUser } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

/**
 * Repository for user-related database operations
 * Handles Google OAuth user management
 */
export class UserRepository extends BaseRepository<typeof users, User, UpsertUser> {
  constructor() {
    super(users);
  }

  /**
   * Find user by email address
   */
  async findByEmail(email: string, tx?: DbTransaction): Promise<User | undefined> {
    const database = this.getDb(tx);
    const [user] = await database
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  /**
   * Upsert user (create or update based on email)
   * Used for Google OAuth authentication
   */
  async upsert(userData: UpsertUser, tx?: DbTransaction): Promise<User> {
    const database = this.getDb(tx);

    try {
      // First, try to find existing user by email
      if (userData.email) {
        const existingUser = await this.findByEmail(userData.email, tx);

        if (existingUser) {
          // Update existing user with new data
          const [updatedUser] = await database
            .update(users)
            .set({
              ...userData,
              updatedAt: new Date(),
            })
            .where(eq(users.email, userData.email))
            .returning();
          return updatedUser;
        }
      }

      // If no existing user found, insert new user
      // Handle conflict on ID in case it's provided and already exists
      const [user] = await database
        .insert(users)
        .values(userData as any)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    } catch (error) {
      // If we still get a constraint violation, it could be due to race conditions
      // Try to find the existing user again and update
      if (error instanceof Error && error.message.includes('duplicate key') && userData.email) {
        const existingUser = await this.findByEmail(userData.email, tx);

        if (existingUser) {
          const [updatedUser] = await database
            .update(users)
            .set({
              ...userData,
              updatedAt: new Date(),
            })
            .where(eq(users.email, userData.email))
            .returning();
          return updatedUser;
        }
      }

      // If we can't handle the error, re-throw it
      throw error;
    }
  }

  /**
   * Check database connectivity
   */
  async ping(): Promise<boolean> {
    try {
      await db.execute({ sql: 'SELECT 1', params: [] });
      return true;
    } catch (error) {
      console.error('Database ping failed:', error);
      return false;
    }
  }
}

export const userRepository = new UserRepository();
