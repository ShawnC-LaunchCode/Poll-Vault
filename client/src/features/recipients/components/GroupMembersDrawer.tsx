import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Search, Users, X, UserPlus, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGroups, type GroupMember } from "@/hooks/useGroups";
import type { GlobalRecipient } from "@shared/schema";

interface GroupMembersDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  globalRecipients: GlobalRecipient[];
}

export function GroupMembersDrawer({
  open,
  onOpenChange,
  groupId,
  groupName,
  globalRecipients,
}: GroupMembersDrawerProps) {
  const { useGroupMembers, addMembers, addMembersPending, removeMember, removeMemberPending } = useGroups();
  const { data: members = [], isLoading: membersLoading } = useGroupMembers(groupId);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [showAddMode, setShowAddMode] = useState(false);

  // Reset state when drawer opens/closes
  useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setSelectedRecipientIds([]);
      setShowAddMode(false);
    }
  }, [open]);

  const memberEmails = new Set(members.map((m) => m.email.toLowerCase()));

  const availableRecipients = globalRecipients.filter(
    (r) => !memberEmails.has(r.email.toLowerCase())
  );

  const filteredAvailableRecipients = availableRecipients.filter(
    (r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleToggleSelection = (recipientId: string) => {
    setSelectedRecipientIds((prev) =>
      prev.includes(recipientId)
        ? prev.filter((id) => id !== recipientId)
        : [...prev, recipientId]
    );
  };

  const handleAddMembers = () => {
    if (selectedRecipientIds.length === 0) return;

    addMembers(
      { groupId, recipientIds: selectedRecipientIds },
      {
        onSuccess: () => {
          setSelectedRecipientIds([]);
          setShowAddMode(false);
          setSearchTerm("");
        },
      }
    );
  };

  const handleRemoveMember = (recipientId: string) => {
    removeMember({ groupId, recipientId });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[540px] sm:max-w-xl flex flex-col p-0"
      >
        <SheetHeader className="px-6 py-4 border-b sticky top-0 bg-background z-10">
          <SheetTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {groupName}
          </SheetTitle>
          <SheetDescription>
            {showAddMode
              ? "Select recipients to add to this group"
              : `${members.length} member${members.length !== 1 ? "s" : ""} in this group`}
          </SheetDescription>
        </SheetHeader>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b bg-muted/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={showAddMode ? "Search recipients to add..." : "Search members..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              aria-label="Search recipients"
            />
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 px-6">
          <div className="py-4 space-y-2">
            {membersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : showAddMode ? (
              // Add Members Mode
              <>
                {filteredAvailableRecipients.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">
                      {availableRecipients.length === 0
                        ? "All global recipients are already in this group"
                        : "No recipients found"}
                    </p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {filteredAvailableRecipients.map((recipient, index) => (
                      <motion.div
                        key={recipient.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{
                          duration: 0.2,
                          delay: index * 0.03,
                          ease: "easeOut",
                        }}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <Checkbox
                          id={`recipient-${recipient.id}`}
                          checked={selectedRecipientIds.includes(recipient.id)}
                          onCheckedChange={() => handleToggleSelection(recipient.id)}
                          className="mt-1"
                          aria-label={`Select ${recipient.name}`}
                        />
                        <label
                          htmlFor={`recipient-${recipient.id}`}
                          className="flex-1 cursor-pointer space-y-1"
                        >
                          <p className="font-medium text-sm">{recipient.name}</p>
                          <p className="text-xs text-muted-foreground">{recipient.email}</p>
                          {recipient.tags && recipient.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {recipient.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </label>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </>
            ) : (
              // View Members Mode
              <>
                {filteredMembers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">
                      {members.length === 0
                        ? "No members in this group yet"
                        : "No members found matching your search"}
                    </p>
                    {members.length === 0 && (
                      <Button
                        onClick={() => setShowAddMode(true)}
                        variant="outline"
                        size="sm"
                        className="mt-4 gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add Members
                      </Button>
                    )}
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {filteredMembers.map((member, index) => (
                      <motion.div
                        key={member.recipientId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{
                          duration: 0.25,
                          delay: index * 0.03,
                          ease: "easeOut",
                        }}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex-1 space-y-1 min-w-0">
                          <p className="font-medium text-sm truncate">{member.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                          {member.tags && member.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {member.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Added {new Date(member.addedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.recipientId)}
                          disabled={removeMemberPending}
                          className="shrink-0 h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Remove ${member.name} from group`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <Separator />
        <SheetFooter className="px-6 py-4 bg-muted/20">
          {showAddMode ? (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddMode(false);
                  setSelectedRecipientIds([]);
                  setSearchTerm("");
                }}
                className="flex-1 sm:flex-initial"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddMembers}
                disabled={selectedRecipientIds.length === 0 || addMembersPending}
                className="flex-1 sm:flex-initial gap-2"
              >
                {addMembersPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Add {selectedRecipientIds.length > 0 ? `(${selectedRecipientIds.length})` : ""}
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 sm:flex-initial"
              >
                Close
              </Button>
              <Button
                onClick={() => setShowAddMode(true)}
                disabled={availableRecipients.length === 0}
                className="flex-1 sm:flex-initial gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add Members
              </Button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
