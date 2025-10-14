import { Card, CardContent } from "@/components/ui/card";
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
      <Card data-testid="stat-total-responses">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Responses</p>
              <p className="text-2xl font-bold">{totalResponses}</p>
            </div>
            <Users className="h-8 w-8 text-primary" />
          </div>
        </CardContent>
      </Card>

      <Card data-testid="stat-avg-completion-time">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg Completion Time</p>
              <p className="text-2xl font-bold">{avgCompletionTime.toFixed(1)}m</p>
            </div>
            <Clock className="h-8 w-8 text-success" />
          </div>
        </CardContent>
      </Card>

      <Card data-testid="stat-answer-rate">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg Answer Rate</p>
              <p className="text-2xl font-bold">{avgAnswerRate.toFixed(1)}%</p>
            </div>
            <CheckCircle className="h-8 w-8 text-warning" />
          </div>
        </CardContent>
      </Card>

      <Card data-testid="stat-engagement-score">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Engagement Score</p>
              <p className="text-2xl font-bold">{engagementScore}</p>
            </div>
            <Activity className="h-8 w-8 text-accent" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
