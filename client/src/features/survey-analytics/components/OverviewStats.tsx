import { StatCard } from "@/components/shared/StatCard";
import { Users, Clock, CheckCircle, Activity } from "lucide-react";

interface OverviewStatsProps {
  totalResponses: number;
  avgCompletionTime: number;
  avgAnswerRate: number;
  engagementScore: number;
}

export function OverviewStats({
  totalResponses,
  avgCompletionTime,
  avgAnswerRate,
  engagementScore
}: OverviewStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        label="Total Responses"
        value={totalResponses}
        icon={Users}
        colorVariant="primary"
        testId="stat-total-responses"
      />

      <StatCard
        label="Avg Completion Time"
        value={`${avgCompletionTime.toFixed(1)}m`}
        icon={Clock}
        colorVariant="success"
        testId="stat-avg-completion-time"
      />

      <StatCard
        label="Avg Answer Rate"
        value={`${avgAnswerRate.toFixed(1)}%`}
        icon={CheckCircle}
        colorVariant="warning"
        testId="stat-answer-rate"
      />

      <StatCard
        label="Engagement Score"
        value={engagementScore}
        icon={Activity}
        colorVariant="accent"
        testId="stat-engagement-score"
      />
    </div>
  );
}
