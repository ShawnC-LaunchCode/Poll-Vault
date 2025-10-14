import { Card, CardContent } from "@/components/ui/card";
import { Users, Mail, Download, Tag, Plus } from "lucide-react";
import type { Recipient, GlobalRecipient } from "@shared/schema";

interface RecipientStatsProps {
  type: "global" | "survey";
  recipients?: Recipient[];
  globalRecipients?: GlobalRecipient[];
  availableTags?: string[];
}

export function RecipientStats({ type, recipients, globalRecipients, availableTags }: RecipientStatsProps) {
  if (type === "global") {
    const recentAdditions = globalRecipients?.filter(r => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return r.createdAt && new Date(r.createdAt) > weekAgo;
    }).length || 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Global Recipients</p>
                <p className="text-3xl font-bold text-foreground" data-testid="text-total-global-recipients">
                  {globalRecipients?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="text-primary w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unique Tags</p>
                <p className="text-3xl font-bold text-foreground" data-testid="text-total-tags">
                  {availableTags?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <Tag className="text-secondary w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Recent Additions</p>
                <p className="text-3xl font-bold text-foreground" data-testid="text-recent-additions">
                  {recentAdditions}
                </p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                <Plus className="text-success w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Survey stats
  const sentInvitations = recipients?.filter(r => r.sentAt).length || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Recipients</p>
              <p className="text-3xl font-bold text-foreground" data-testid="text-total-recipients">
                {recipients?.length || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="text-primary w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Invitations Sent</p>
              <p className="text-3xl font-bold text-foreground" data-testid="text-sent-invitations">
                {sentInvitations}
              </p>
            </div>
            <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
              <Mail className="text-success w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Response Rate</p>
              <p className="text-3xl font-bold text-foreground" data-testid="text-response-rate">
                0%
              </p>
            </div>
            <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
              <Download className="text-warning w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
