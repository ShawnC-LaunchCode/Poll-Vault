import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Clock, PieChart as PieChartIcon } from "lucide-react";
import { ChartEmptyState } from "@/components/shared/ChartEmptyState";
import type { TimeSpentData, PageAnalytics } from "@shared/schema";

interface TimeAnalysisTabProps {
  timeSpentData: TimeSpentData[];
  pageAnalytics: PageAnalytics[];
  chartConfig: Record<string, { color: string }>;
  colors: string[];
}

export function TimeAnalysisTab({ timeSpentData, pageAnalytics, chartConfig, colors }: TimeAnalysisTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Time Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Completion Time Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {timeSpentData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-64">
              <BarChart data={timeSpentData.slice(0, 20).map((data, index) => ({
                response: `R${index + 1}`,
                minutes: data.totalTime / 60000
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="response" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="minutes"
                  fill="var(--color-success)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <ChartEmptyState icon={Clock} message="No time tracking data available" />
          )}
        </CardContent>
      </Card>

      {/* Page Time Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Time Spent per Page</CardTitle>
        </CardHeader>
        <CardContent>
          {pageAnalytics.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-64">
              <PieChart>
                <Pie
                  data={pageAnalytics.map((page, index) => ({
                    name: page.pageTitle,
                    value: page.avgTimeSpent,
                    fill: colors[index % colors.length]
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {pageAnalytics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
              </PieChart>
            </ChartContainer>
          ) : (
            <ChartEmptyState icon={PieChartIcon} message="No page time data available" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
