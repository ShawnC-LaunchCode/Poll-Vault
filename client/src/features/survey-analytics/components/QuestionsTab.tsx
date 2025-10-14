import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { BarChart3, Clock } from "lucide-react";
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
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-16 w-16 mb-4 opacity-50 mx-auto" />
                  <p>No question analytics available</p>
                </div>
              </div>
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
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Clock className="h-16 w-16 mb-4 opacity-50 mx-auto" />
                  <p>No time tracking data available</p>
                </div>
              </div>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Question</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-right p-2">Views</th>
                  <th className="text-right p-2">Answers</th>
                  <th className="text-right p-2">Answer Rate</th>
                  <th className="text-right p-2">Avg Time</th>
                  <th className="text-right p-2">Drop-offs</th>
                </tr>
              </thead>
              <tbody>
                {questionAnalytics.map((question) => (
                  <tr key={question.questionId} className="border-b">
                    <td className="p-2 font-medium" data-testid={`question-${question.questionId}`}>
                      {question.questionTitle}
                    </td>
                    <td className="p-2">
                      <Badge variant="outline">{question.questionType}</Badge>
                    </td>
                    <td className="p-2 text-right">{question.totalViews}</td>
                    <td className="p-2 text-right">{question.totalAnswers}</td>
                    <td className="p-2 text-right">
                      <Badge variant={question.answerRate > 80 ? "default" : question.answerRate > 60 ? "secondary" : "destructive"}>
                        {question.answerRate}%
                      </Badge>
                    </td>
                    <td className="p-2 text-right">{question.avgTimeSpent.toFixed(1)}s</td>
                    <td className="p-2 text-right">
                      <span className="text-destructive">{question.dropOffCount}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
