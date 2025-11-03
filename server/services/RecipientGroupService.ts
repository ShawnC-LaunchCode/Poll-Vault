import { RecipientGroupRepository } from "../repositories/RecipientGroupRepository";

export class RecipientGroupService {
  constructor(private repo = new RecipientGroupRepository()) {}

  async create(creatorId: string, name: string, description?: string) {
    if (!name?.trim()) {
      throw new Error("Name is required");
    }
    return this.repo.createGroup(creatorId, name.trim(), description?.trim());
  }

  async list(creatorId: string) {
    return this.repo.listGroups(creatorId);
  }

  async update(creatorId: string, groupId: string, patch: { name?: string; description?: string }) {
    return this.repo.updateGroup(creatorId, groupId, patch);
  }

  async remove(creatorId: string, groupId: string) {
    return this.repo.deleteGroup(creatorId, groupId);
  }

  async addMembers(creatorId: string, groupId: string, recipientIds: string[]) {
    return this.repo.addMembers(creatorId, groupId, recipientIds);
  }

  async removeMember(creatorId: string, groupId: string, recipientId: string) {
    return this.repo.removeMember(creatorId, groupId, recipientId);
  }

  async listMembers(creatorId: string, groupId: string) {
    return this.repo.listGroupMembers(creatorId, groupId);
  }
}
