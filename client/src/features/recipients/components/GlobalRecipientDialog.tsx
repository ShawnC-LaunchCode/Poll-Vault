import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import type { GlobalRecipient } from "@shared/schema";

interface GlobalRecipientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRecipient: GlobalRecipient | null;
  recipientData: { name: string; email: string; tags: string };
  onRecipientDataChange: (data: { name: string; email: string; tags: string }) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function GlobalRecipientDialog({
  open,
  onOpenChange,
  editingRecipient,
  recipientData,
  onRecipientDataChange,
  onSave,
  isSaving
}: GlobalRecipientDialogProps) {
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-global-recipient">
          <Plus className="w-4 h-4 mr-2" />
          Add Global Recipient
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingRecipient ? "Edit Global Recipient" : "Add Global Recipient"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Name</label>
            <Input
              placeholder="Enter recipient name"
              value={recipientData.name}
              onChange={(e) => onRecipientDataChange({ ...recipientData, name: e.target.value })}
              data-testid="input-global-recipient-name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Email</label>
            <Input
              type="email"
              placeholder="Enter recipient email"
              value={recipientData.email}
              onChange={(e) => onRecipientDataChange({ ...recipientData, email: e.target.value })}
              data-testid="input-global-recipient-email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Tags (Optional)</label>
            <Input
              placeholder="Enter tags separated by commas"
              value={recipientData.tags}
              onChange={(e) => onRecipientDataChange({ ...recipientData, tags: e.target.value })}
              data-testid="input-global-recipient-tags"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use tags to categorize recipients (e.g., "customers, newsletter, beta-users")
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={handleClose}
              data-testid="button-cancel-global-recipient"
            >
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={isSaving}
              data-testid="button-save-global-recipient"
            >
              {isSaving
                ? (editingRecipient ? "Updating..." : "Adding...")
                : (editingRecipient ? "Update Recipient" : "Add Recipient")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
