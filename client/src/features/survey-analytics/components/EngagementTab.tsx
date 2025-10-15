import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { Activity } from "lucide-react";
import { ChartEmptyState } from "@/components/shared/ChartEmptyState";
import type { EngagementMetrics } from "@shared/schema";

interface EngagementTabProps {
  engagementMetrics: EngagementMetrics | undefined;
  chartConfig: Record<string, { color: string }>;
}

export function EngagementTab({ engagementMetrics, chartConfig }: EngagementTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Engagement Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Engagement Score</span>
            <div className="flex items-center space-x-2">
              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${engagementMetrics?.engagementScore || 0}%` }}
                />
              </div>
              <span className="font-bold">{engagementMetrics?.engagementScore || 0}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span>Bounce Rate</span>
            <Badge variant={
              (engagementMetrics?.bounceRate || 0) > 50 ? "destructive" :
              (engagementMetrics?.bounceRate || 0) > 30 ? "secondary" : "default"
            }>
              {engagementMetrics?.bounceRate || 0}%
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Avg Session Duration</span>
            <span className="font-bold">{(engagementMetrics?.avgSessionDuration || 0).toFixed(1)}m</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Peak Engagement Hour</span>
            <span className="font-bold">{engagementMetrics?.peakEngagementHour || 12}:00</span>
          </div>
        </CardContent>
      </Card>

      {/* Completion Trends by Hour */}
      <Card>
        <CardHeader>
          <CardTitle>Completion Trends by Hour</CardTitle>
        </CardHeader>
        <CardContent>
          {engagementMetrics?.completionTrends.length ? (
            <ChartContainer config={chartConfig} className="h-64">
              <LineChart data={engagementMetrics.completionTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="completions"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-primary)" }}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <ChartEmptyState icon={Activity} message="No engagement trends available" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
