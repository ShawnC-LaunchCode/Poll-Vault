import type { Express } from "express";
import { isAuthenticated } from "../googleAuth";
import { RecipientGroupService } from "../services/RecipientGroupService";

const recipientGroupService = new RecipientGroupService();

/**
 * Register recipient group routes
 * Handles recipient group CRUD operations and member management
 */
export function registerRecipientGroupRoutes(app: Express): void {
  /**
   * POST /api/recipient-groups
   * Create a new recipient group
   */
  app.post("/api/recipient-groups", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }

      const { name, description } = req.body || {};
      const group = await recipientGroupService.create(userId, name, description);
      res.status(201).json(group);
    } catch (error) {
      console.error("Error creating recipient group:", error);
      res.status(500).json({
        message: "Failed to create recipient group",
        error: process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined,
      });
    }
  });

  /**
   * GET /api/recipient-groups
   * List all recipient groups for the authenticated user
   */
  app.get("/api/recipient-groups", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }

      const groups = await recipientGroupService.list(userId);
      res.json(groups);
    } catch (error) {
      console.error("Error listing recipient groups:", error);
      res.status(500).json({
        message: "Failed to list recipient groups",
        error: process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined,
      });
    }
  });

  /**
   * PUT /api/recipient-groups/:id
   * Update a recipient group
   */
  app.put("/api/recipient-groups/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }

      const { name, description } = req.body || {};
      const group = await recipientGroupService.update(userId, req.params.id, { name, description });

      if (!group) {
        return res.status(404).json({ message: "Recipient group not found" });
      }

      res.json(group);
    } catch (error) {
      console.error("Error updating recipient group:", error);
      res.status(500).json({
        message: "Failed to update recipient group",
        error: process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined,
      });
    }
  });

  /**
   * DELETE /api/recipient-groups/:id
   * Delete a recipient group
   */
  app.delete("/api/recipient-groups/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }

      const ok = await recipientGroupService.remove(userId, req.params.id);
      res.json({ ok });
    } catch (error) {
      console.error("Error deleting recipient group:", error);
      res.status(500).json({
        message: "Failed to delete recipient group",
        error: process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined,
      });
    }
  });

  /**
   * GET /api/recipient-groups/:id/members
   * List all members of a recipient group
   */
  app.get("/api/recipient-groups/:id/members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }

      const members = await recipientGroupService.listMembers(userId, req.params.id);
      res.json(members);
    } catch (error) {
      console.error("Error listing group members:", error);
      res.status(500).json({
        message: "Failed to list group members",
        error: process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined,
      });
    }
  });

  /**
   * POST /api/recipient-groups/:id/members
   * Add members to a recipient group
   */
  app.post("/api/recipient-groups/:id/members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }

      const { recipientIds } = req.body || {};
      const count = await recipientGroupService.addMembers(
        userId,
        req.params.id,
        Array.isArray(recipientIds) ? recipientIds : []
      );

      res.json({ added: count });
    } catch (error) {
      console.error("Error adding group members:", error);
      res.status(500).json({
        message: "Failed to add group members",
        error: process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined,
      });
    }
  });

  /**
   * DELETE /api/recipient-groups/:id/members/:recipientId
   * Remove a member from a recipient group
   */
  app.delete("/api/recipient-groups/:id/members/:recipientId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - no user ID" });
      }

      const ok = await recipientGroupService.removeMember(userId, req.params.id, req.params.recipientId);
      res.json({ ok });
    } catch (error) {
      console.error("Error removing group member:", error);
      res.status(500).json({
        message: "Failed to remove group member",
        error: process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined,
      });
    }
  });
}
