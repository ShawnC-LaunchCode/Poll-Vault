import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Users, Download, Plus } from "lucide-react";
import type { Recipient } from "@shared/schema";

interface SurveyRecipientsListProps {
  recipients: Recipient[];
  isLoading: boolean;
  selectedIds: string[];
  onToggleSelection: (id: string) => void;
  onToggleAll: () => void;
  isAllSelected: boolean;
  onCopyLink: (token: string) => void;
  onAddClick: () => void;
  getSurveyUrl: (token: string) => string;
}

export function SurveyRecipientsList({
  recipients,
  isLoading,
  selectedIds,
  onToggleSelection,
  onToggleAll,
  isAllSelected,
  onCopyLink,
  onAddClick,
  getSurveyUrl
}: SurveyRecipientsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg animate-pulse">
            <div className="flex items-center space-x-4">
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
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="text-muted-foreground w-8 h-8" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No recipients yet</h3>
        <p className="text-muted-foreground mb-4">Add recipients to start distributing your survey</p>
        <Button onClick={onAddClick} data-testid="button-add-first-recipient">
          <Plus className="w-4 h-4 mr-2" />
          Add First Recipient
        </Button>
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
            data-testid="checkbox-select-all-survey-recipients"
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
              data-testid={`checkbox-survey-recipient-${recipient.id}`}
            />
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="text-primary w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-foreground" data-testid={`text-recipient-name-${recipient.id}`}>
                {recipient.name}
              </h3>
              <p className="text-sm text-muted-foreground" data-testid={`text-recipient-email-${recipient.id}`}>
                {recipient.email}
              </p>
              {recipient.sentAt && (
                <p className="text-xs text-muted-foreground" data-testid={`text-recipient-sent-at-${recipient.id}`}>
                  Sent: {new Date(recipient.sentAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant={recipient.sentAt ? "default" : "secondary"} data-testid={`badge-recipient-status-${recipient.id}`}>
              {recipient.sentAt ? "Sent" : "Pending"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCopyLink(getSurveyUrl(recipient.token))}
              data-testid={`button-copy-link-${recipient.id}`}
            >
              <Download className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
