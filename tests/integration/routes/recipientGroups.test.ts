import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../../../server/index";
import { createAuthenticatedAgent } from "../../factories/testHelpers";
import { db } from "../../../server/db";
import { recipientGroups, globalRecipients, recipientGroupMembers } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Integration tests for Recipient Groups API
 * Tests group CRUD operations and member management
 */
describe("Recipient Groups API", () => {
  let agent: request.SuperAgentTest;
  let user: any;
  let testGroupId: string;
  let testRecipientId: string;

  beforeEach(async () => {
    // Use the dev user that dev-login creates
    user = {
      id: "dev-user-123",
      email: "dev@example.com",
      firstName: "Dev",
      lastName: "User",
    };
    agent = await createAuthenticatedAgent(app);

    // Create a test global recipient for member tests
    const [recipient] = await db
      .insert(globalRecipients)
      .values({
        creatorId: user.id,
        name: "Test Recipient",
        email: "test@example.com",
        tags: ["test"],
      } as any)
      .returning();
    testRecipientId = recipient.id;
  });

  afterEach(async () => {
    // Clean up test data
    if (testGroupId) {
      await db.delete(recipientGroups).where(eq(recipientGroups.id, testGroupId));
    }
    if (testRecipientId) {
      await db.delete(globalRecipients).where(eq(globalRecipients.id, testRecipientId));
    }
  });

  describe("POST /api/recipient-groups", () => {
    it("should create a new recipient group", async () => {
      const groupData = {
        name: "Beta Testers",
        description: "Early adopters for new features",
      };

      const response = await agent
        .post("/api/recipient-groups")
        .send(groupData)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.name).toBe(groupData.name);
      expect(response.body.description).toBe(groupData.description);
      expect(response.body.creatorId).toBe(user.id);

      testGroupId = response.body.id;
    });

    it("should create a group without description", async () => {
      const response = await agent
        .post("/api/recipient-groups")
        .send({ name: "Test Group" })
        .expect(201);

      expect(response.body.name).toBe("Test Group");
      testGroupId = response.body.id;
    });

    it("should reject creation without name", async () => {
      const response = await agent
        .post("/api/recipient-groups")
        .send({ description: "Missing name" })
        .expect(500);

      expect(response.body).toHaveProperty("message");
    });

    it("should reject unauthenticated requests", async () => {
      const response = await request(app)
        .post("/api/recipient-groups")
        .send({ name: "Unauthorized Group" })
        .expect(401);

      expect(response.body).toHaveProperty("message");
    });
  });

  describe("GET /api/recipient-groups", () => {
    beforeEach(async () => {
      // Create a test group
      const [group] = await db
        .insert(recipientGroups)
        .values({
          creatorId: user.id,
          name: "Test Group",
          description: "Test description",
        } as any)
        .returning();
      testGroupId = group.id;
    });

    it("should list all recipient groups for authenticated user", async () => {
      const response = await agent.get("/api/recipient-groups").expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty("id");
      expect(response.body[0]).toHaveProperty("name");
      expect(response.body[0]).toHaveProperty("membersCount");
    });

    it("should reject unauthenticated requests", async () => {
      const response = await request(app).get("/api/recipient-groups").expect(401);

      expect(response.body).toHaveProperty("message");
    });
  });

  describe("PUT /api/recipient-groups/:id", () => {
    beforeEach(async () => {
      // Create a test group
      const [group] = await db
        .insert(recipientGroups)
        .values({
          creatorId: user.id,
          name: "Original Name",
          description: "Original description",
        } as any)
        .returning();
      testGroupId = group.id;
    });

    it("should update a recipient group", async () => {
      const response = await agent
        .put(`/api/recipient-groups/${testGroupId}`)
        .send({ name: "Updated Name", description: "Updated description" })
        .expect(200);

      expect(response.body.name).toBe("Updated Name");
      expect(response.body.description).toBe("Updated description");
    });

    it("should return 404 for non-existent group", async () => {
      const response = await agent
        .put("/api/recipient-groups/00000000-0000-0000-0000-000000000000")
        .send({ name: "Updated" })
        .expect(404);

      expect(response.body).toHaveProperty("message");
    });
  });

  describe("DELETE /api/recipient-groups/:id", () => {
    beforeEach(async () => {
      // Create a test group
      const [group] = await db
        .insert(recipientGroups)
        .values({
          creatorId: user.id,
          name: "Group to Delete",
        } as any)
        .returning();
      testGroupId = group.id;
    });

    it("should delete a recipient group", async () => {
      const response = await agent
        .delete(`/api/recipient-groups/${testGroupId}`)
        .expect(200);

      expect(response.body.ok).toBe(true);

      // Verify deletion
      const [deleted] = await db
        .select()
        .from(recipientGroups)
        .where(eq(recipientGroups.id, testGroupId));
      expect(deleted).toBeUndefined();

      testGroupId = ""; // Clear so afterEach doesn't try to delete again
    });
  });

  describe("POST /api/recipient-groups/:id/members", () => {
    beforeEach(async () => {
      // Create a test group
      const [group] = await db
        .insert(recipientGroups)
        .values({
          creatorId: user.id,
          name: "Test Group",
        } as any)
        .returning();
      testGroupId = group.id;
    });

    it("should add members to a group", async () => {
      const response = await agent
        .post(`/api/recipient-groups/${testGroupId}/members`)
        .send({ recipientIds: [testRecipientId] })
        .expect(200);

      expect(response.body.added).toBe(1);
    });

    it("should handle empty recipient array", async () => {
      const response = await agent
        .post(`/api/recipient-groups/${testGroupId}/members`)
        .send({ recipientIds: [] })
        .expect(200);

      expect(response.body.added).toBe(0);
    });
  });

  describe("GET /api/recipient-groups/:id/members", () => {
    beforeEach(async () => {
      // Create a test group
      const [group] = await db
        .insert(recipientGroups)
        .values({
          creatorId: user.id,
          name: "Test Group",
        } as any)
        .returning();
      testGroupId = group.id;

      // Add member to group
      await db
        .insert(recipientGroupMembers)
        .values({
          groupId: testGroupId,
          recipientId: testRecipientId,
        } as any);
    });

    it("should list all members of a group", async () => {
      const response = await agent
        .get(`/api/recipient-groups/${testGroupId}/members`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].id).toBe(testRecipientId);
      expect(response.body[0]).toHaveProperty("email");
      expect(response.body[0]).toHaveProperty("addedAt");
    });
  });

  describe("DELETE /api/recipient-groups/:id/members/:recipientId", () => {
    beforeEach(async () => {
      // Create a test group
      const [group] = await db
        .insert(recipientGroups)
        .values({
          creatorId: user.id,
          name: "Test Group",
        } as any)
        .returning();
      testGroupId = group.id;

      // Add member to group
      await db
        .insert(recipientGroupMembers)
        .values({
          groupId: testGroupId,
          recipientId: testRecipientId,
        } as any);
    });

    it("should remove a member from a group", async () => {
      const response = await agent
        .delete(`/api/recipient-groups/${testGroupId}/members/${testRecipientId}`)
        .expect(200);

      expect(response.body.ok).toBe(true);

      // Verify removal
      const [removed] = await db
        .select()
        .from(recipientGroupMembers)
        .where(eq(recipientGroupMembers.groupId, testGroupId));
      expect(removed).toBeUndefined();
    });
  });
});
