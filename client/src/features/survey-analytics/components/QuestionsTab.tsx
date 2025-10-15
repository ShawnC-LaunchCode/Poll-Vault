import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { BarChart3, Clock } from "lucide-react";
import { ChartEmptyState } from "@/components/shared/ChartEmptyState";
import { DataTable } from "@/components/shared/DataTable";
import type { QuestionAnalytics } from "@shared/schema";

interface QuestionsTabProps {
  questionAnalytics: QuestionAnalytics[];
  chartConfig: Record<string, { color: string }>;
}

export function QuestionsTab({ questionAnalytics, chartConfig }: QuestionsTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Question Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Question Answer Rates</CardTitle>
          </CardHeader>
          <CardContent>
            {questionAnalytics.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-64">
                <BarChart data={questionAnalytics.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="questionTitle"
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="answerRate"
                    fill="var(--color-primary)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <ChartEmptyState icon={BarChart3} message="No question analytics available" />
            )}
          </CardContent>
        </Card>

        {/* Question Time Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Average Time per Question</CardTitle>
          </CardHeader>
          <CardContent>
            {questionAnalytics.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-64">
                <LineChart data={questionAnalytics.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="questionTitle"
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="avgTimeSpent"
                    stroke="var(--color-warning)"
                    strokeWidth={2}
                    dot={{ fill: "var(--color-warning)" }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <ChartEmptyState icon={Clock} message="No time tracking data available" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Question Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Question Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={questionAnalytics}
            columns={[
              {
                header: "Question",
                accessor: "questionTitle",
                align: "left",
                className: "font-medium"
              },
              {
                header: "Type",
                accessor: (row) => <Badge variant="outline">{row.questionType}</Badge>,
                align: "left"
              },
              {
                header: "Views",
                accessor: "totalViews",
                align: "right"
              },
              {
                header: "Answers",
                accessor: "totalAnswers",
                align: "right"
              },
              {
                header: "Answer Rate",
                accessor: (row) => (
                  <Badge variant={row.answerRate > 80 ? "default" : row.answerRate > 60 ? "secondary" : "destructive"}>
                    {row.answerRate}%
                  </Badge>
                ),
                align: "right"
              },
              {
                header: "Avg Time",
                accessor: (row) => `${row.avgTimeSpent.toFixed(1)}s`,
                align: "right"
              },
              {
                header: "Drop-offs",
                accessor: (row) => <span className="text-destructive">{row.dropOffCount}</span>,
                align: "right"
              }
            ]}
            getRowKey={(row) => row.questionId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
