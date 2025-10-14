import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        <Button data-testid="button-send-invitations">
          <Mail className="w-4 h-4 mr-2" />
          Send Invitations ({selectedCount})
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send Survey Invitations</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to send invitations to {selectedCount} selected recipient(s)?
            This will send personalized email invitations with unique survey links.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            data-testid="button-confirm-send-invitations"
          >
            {isPending ? "Sending..." : "Send Invitations"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
