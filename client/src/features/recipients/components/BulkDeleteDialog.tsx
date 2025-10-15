import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: () => void;
  isPending: boolean;
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
  isPending
}: BulkDeleteDialogProps) {
  return (
    <ConfirmationDialog
      trigger={
        <Button variant="destructive" size="sm" data-testid="button-bulk-delete">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Selected ({selectedCount})
        </Button>
      }
      title="Delete Selected Recipients"
      description={`Are you sure you want to delete ${selectedCount} selected recipients? This action cannot be undone.`}
      confirmText="Delete"
      variant="destructive"
      onConfirm={onConfirm}
      isPending={isPending}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
