import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, BarChart3 } from "lucide-react";
import type { ResponseTrend, SurveyAnalytics } from "@shared/schema";

interface AnalyticsChartsProps {
  responsesTrend: ResponseTrend[];
  surveyAnalytics: SurveyAnalytics[];
  isLoading?: boolean;
}

export function AnalyticsCharts({ responsesTrend, surveyAnalytics, isLoading }: AnalyticsChartsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Response Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Survey Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const chartConfig = {
    responses: {
      label: "Total Responses",
      color: "hsl(var(--primary))",
    },
    completed: {
      label: "Completed",
      color: "hsl(var(--chart-2))",
    },
  };

  const surveyChartConfig = {
    responseCount: {
      label: "Responses",
      color: "hsl(var(--primary))",
    },
    completionRate: {
      label: "Completion Rate (%)",
      color: "hsl(var(--chart-3))",
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Response Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-4 w-4 text-primary" />
            Response Trends (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {responsesTrend.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-64">
              <LineChart data={responsesTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="var(--color-responses)" 
                  strokeWidth={2}
                  dot={{ fill: "var(--color-responses)" }}
                />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="var(--color-completed)" 
                  strokeWidth={2}
                  dot={{ fill: "var(--color-completed)" }}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="h-16 w-16 mb-4 opacity-50 text-muted-foreground" />
                <p>No response data available yet</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Survey Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-4 w-4 text-primary" />
            Survey Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {surveyAnalytics.length > 0 ? (
            <ChartContainer config={surveyChartConfig} className="h-64">
              <BarChart data={surveyAnalytics.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="title" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar 
                  dataKey="responseCount" 
                  fill="var(--color-responseCount)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-16 w-16 mb-4 opacity-50 text-muted-foreground" />
                <p>No survey performance data available</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}