import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, Plus, Trash2, Edit2, Loader2, Folder } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { RecipientGroup } from "@/hooks/useGroups";

interface GroupsListProps {
  groups: RecipientGroup[];
  isLoading: boolean;
  onCreateGroup: (data: { name: string; description?: string }) => void;
  onUpdateGroup: (id: string, data: { name?: string; description?: string }) => void;
  onDeleteGroup: (id: string) => void;
  onViewMembers: (group: RecipientGroup) => void;
  createPending: boolean;
  updatePending: boolean;
  deletePending: boolean;
}

export function GroupsList({
  groups,
  isLoading,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onViewMembers,
  createPending,
  updatePending,
  deletePending,
}: GroupsListProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<RecipientGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<RecipientGroup | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [searchTerm, setSearchTerm] = useState("");

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    if (!formData.name.trim()) return;

    onCreateGroup({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
    });
    setFormData({ name: "", description: "" });
    setIsCreateDialogOpen(false);
  };

  const handleEdit = () => {
    if (!editingGroup || !formData.name.trim()) return;

    onUpdateGroup(editingGroup.id, {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
    });
    setFormData({ name: "", description: "" });
    setEditingGroup(null);
    setIsEditDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deletingGroup) return;

    onDeleteGroup(deletingGroup.id);
    setDeletingGroup(null);
    setIsDeleteDialogOpen(false);
  };

  const openEditDialog = (group: RecipientGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (group: RecipientGroup) => {
    setDeletingGroup(group);
    setIsDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with search and create */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <Input
          placeholder="Search groups..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
          aria-label="Search groups"
        />
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="gap-2 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Create Group
        </Button>
      </div>

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center text-muted-foreground py-12">
          <Folder className="w-16 h-16 mb-4 opacity-20" />
          <h3 className="text-lg font-semibold mb-2">
            {groups.length === 0 ? "No groups created yet" : "No groups found"}
          </h3>
          <p className="text-sm mb-6 max-w-sm">
            {groups.length === 0
              ? "Create your first group to organize your recipients into categories"
              : "Try a different search term"}
          </p>
          {groups.length === 0 && (
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="gap-2"
              size="lg"
            >
              <Plus className="w-5 h-5" />
              Create your first group
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredGroups.map((group, index) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.05,
                  ease: "easeOut",
                }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow duration-200">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{group.name}</CardTitle>
                        {group.description && (
                          <CardDescription className="line-clamp-2 mt-1">
                            {group.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(group)}
                          className="h-8 w-8 p-0"
                          aria-label={`Edit ${group.name}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(group)}
                          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Delete ${group.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="gap-1">
                        <Users className="w-3 h-3" />
                        {group.memberCount || 0} member{group.memberCount !== 1 ? "s" : ""}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewMembers(group)}
                        className="gap-2"
                      >
                        <Users className="w-4 h-4" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Create a group to organize your recipients into categories
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Name *</Label>
              <Input
                id="group-name"
                placeholder="e.g., VIP Customers, Beta Testers"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                aria-required="true"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-description">Description</Label>
              <Textarea
                id="group-description"
                placeholder="Optional description for this group"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFormData({ name: "", description: "" });
                setIsCreateDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.name.trim() || createPending}
              className="gap-2"
            >
              {createPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>
              Update the group name and description
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-group-name">Name *</Label>
              <Input
                id="edit-group-name"
                placeholder="Group name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                aria-required="true"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-group-description">Description</Label>
              <Textarea
                id="edit-group-description"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFormData({ name: "", description: "" });
                setEditingGroup(null);
                setIsEditDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!formData.name.trim() || updatePending}
              className="gap-2"
            >
              {updatePending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              Remove this group? This only deletes the group, not its members.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{deletingGroup?.name}</strong>?
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeletingGroup(null);
                setIsDeleteDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePending}
              className="gap-2"
            >
              {deletePending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
