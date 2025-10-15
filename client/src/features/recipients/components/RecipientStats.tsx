import { StatCard } from "@/components/shared/StatCard";
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
        <StatCard
          label="Total Global Recipients"
          value={globalRecipients?.length || 0}
          icon={Users}
          colorVariant="primary"
          testId="text-total-global-recipients"
        />

        <StatCard
          label="Unique Tags"
          value={availableTags?.length || 0}
          icon={Tag}
          colorVariant="secondary"
          testId="text-total-tags"
        />

        <StatCard
          label="Recent Additions"
          value={recentAdditions}
          icon={Plus}
          colorVariant="success"
          testId="text-recent-additions"
        />
      </div>
    );
  }

  // Survey stats
  const sentInvitations = recipients?.filter(r => r.sentAt).length || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard
        label="Total Recipients"
        value={recipients?.length || 0}
        icon={Users}
        colorVariant="primary"
        testId="text-total-recipients"
      />

      <StatCard
        label="Invitations Sent"
        value={sentInvitations}
        icon={Mail}
        colorVariant="success"
        testId="text-sent-invitations"
      />

      <StatCard
        label="Response Rate"
        value="0%"
        icon={Download}
        colorVariant="warning"
        testId="text-response-rate"
      />
    </div>
  );
}
