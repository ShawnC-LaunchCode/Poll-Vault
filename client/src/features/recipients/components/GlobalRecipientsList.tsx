import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users, Edit3, Trash2, Plus } from "lucide-react";
import type { GlobalRecipient } from "@shared/schema";

interface GlobalRecipientsListProps {
  recipients: GlobalRecipient[];
  isLoading: boolean;
  selectedIds: string[];
  onToggleSelection: (id: string) => void;
  onToggleAll: () => void;
  isAllSelected: boolean;
  onEdit: (recipient: GlobalRecipient) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  onAddClick: () => void;
  searchTerm?: string;
  filterTag?: string;
}

export function GlobalRecipientsList({
  recipients,
  isLoading,
  selectedIds,
  onToggleSelection,
  onToggleAll,
  isAllSelected,
  onEdit,
  onDelete,
  isDeleting,
  onAddClick,
  searchTerm,
  filterTag
}: GlobalRecipientsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="w-4 h-4 bg-muted rounded"></div>
              <div className="w-10 h-10 bg-muted rounded-full"></div>
              <div>
                <div className="h-4 bg-muted rounded w-48 mb-2"></div>
                <div className="h-3 bg-muted rounded w-32"></div>
              </div>
            </div>
            <div className="w-20 h-6 bg-muted rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (recipients.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="text-muted-foreground w-8 h-8" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          {searchTerm || (filterTag && filterTag !== "all-tags") ? "No recipients found" : "No global recipients yet"}
        </h3>
        <p className="text-muted-foreground mb-4">
          {searchTerm || (filterTag && filterTag !== "all-tags")
            ? "Try adjusting your search or filter criteria"
            : "Build your global recipient database to reuse across surveys"}
        </p>
        {!searchTerm && (!filterTag || filterTag === "all-tags") && (
          <Button onClick={onAddClick} data-testid="button-add-first-global-recipient">
            <Plus className="w-4 h-4 mr-2" />
            Add First Global Recipient
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recipients.length > 0 && (
        <div className="flex items-center gap-2 pb-2">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={onToggleAll}
            data-testid="checkbox-select-all-global"
          />
          <span className="text-sm text-muted-foreground">Select All</span>
        </div>
      )}

      {recipients.map((recipient) => (
        <div key={recipient.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
          <div className="flex items-center space-x-4">
            <Checkbox
              checked={selectedIds.includes(recipient.id)}
              onCheckedChange={() => onToggleSelection(recipient.id)}
              data-testid={`checkbox-recipient-${recipient.id}`}
            />
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="text-primary w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-foreground" data-testid={`text-global-recipient-name-${recipient.id}`}>
                {recipient.name}
              </h3>
              <p className="text-sm text-muted-foreground" data-testid={`text-global-recipient-email-${recipient.id}`}>
                {recipient.email}
              </p>
              {recipient.tags && recipient.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {recipient.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(recipient)}
              data-testid={`button-edit-global-${recipient.id}`}
            >
              <Edit3 className="w-4 h-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid={`button-delete-global-${recipient.id}`}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Global Recipient</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{recipient.name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(recipient.id)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}
    </div>
  );
}
