import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { BarChart3, Clock } from "lucide-react";
import { ChartEmptyState } from "@/components/shared/ChartEmptyState";
import type { PageAnalytics } from "@shared/schema";

interface OverviewTabProps {
  pageAnalytics: PageAnalytics[];
  chartConfig: Record<string, { color: string }>;
}

export function OverviewTab({ pageAnalytics, chartConfig }: OverviewTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Page Analytics Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Page Completion Rates</CardTitle>
        </CardHeader>
        <CardContent>
          {pageAnalytics.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-64">
              <BarChart data={pageAnalytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="pageTitle"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="completionRate"
                  fill="var(--color-primary)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <ChartEmptyState icon={BarChart3} message="No page analytics data available" />
          )}
        </CardContent>
      </Card>

      {/* Time Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Average Time per Page</CardTitle>
        </CardHeader>
        <CardContent>
          {pageAnalytics.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-64">
              <LineChart data={pageAnalytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="pageTitle"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="avgTimeSpent"
                  stroke="var(--color-success)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-success)" }}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <ChartEmptyState icon={Clock} message="No time tracking data available" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
