import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

interface SendInvitationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: () => void;
  isPending: boolean;
}

export function SendInvitationsDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
  isPending
}: SendInvitationsDialogProps) {
  return (
    <ConfirmationDialog
      trigger={
        <Button data-testid="button-send-invitations">
          <Mail className="w-4 h-4 mr-2" />
          Send Invitations ({selectedCount})
        </Button>
      }
      title="Send Survey Invitations"
      description={`Are you sure you want to send invitations to ${selectedCount} selected recipient(s)? This will send personalized email invitations with unique survey links.`}
      confirmText="Send Invitations"
      onConfirm={onConfirm}
      isPending={isPending}
      open={open}
      onOpenChange={onOpenChange}
      confirmTestId="button-confirm-send-invitations"
    />
  );
}
