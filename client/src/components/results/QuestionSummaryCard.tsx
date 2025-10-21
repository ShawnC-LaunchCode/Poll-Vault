import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface QuestionAnalytics {
  questionId: string;
  questionTitle: string;
  questionType: string;
  totalResponses: number;
  answerRate: number;
  avgTimeSpent: number | null;
  aggregates?: {
    option: string;
    count: number;
    percentage: number;
  }[];
  textAnswers?: string[];
}

interface QuestionSummaryCardProps {
  question: QuestionAnalytics;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export function QuestionSummaryCard({ question }: QuestionSummaryCardProps) {
  const renderVisualization = () => {
    switch (question.questionType) {
      case 'multiple_choice':
      case 'radio':
        if (!question.aggregates || question.aggregates.length === 0) {
          return <p className="text-sm text-muted-foreground text-center py-8">No responses yet</p>;
        }

        return (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={question.aggregates} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <XAxis
                dataKey="option"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                        <p className="text-sm font-medium">{payload[0].payload.option}</p>
                        <p className="text-sm text-muted-foreground">
                          {payload[0].value} responses ({payload[0].payload.percentage}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'yes_no':
        if (!question.aggregates || question.aggregates.length === 0) {
          return <p className="text-sm text-muted-foreground text-center py-8">No responses yet</p>;
        }

        return (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={question.aggregates}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ option, percentage }) => `${option}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                nameKey="option"
              >
                {question.aggregates.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                        <p className="text-sm font-medium">{payload[0].name}</p>
                        <p className="text-sm text-muted-foreground">
                          {payload[0].value} responses ({payload[0].payload.percentage}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'short_text':
      case 'long_text':
        if (!question.textAnswers || question.textAnswers.length === 0) {
          return <p className="text-sm text-muted-foreground text-center py-8">No text responses yet</p>;
        }

        // Show first 5 text responses
        const sampleAnswers = question.textAnswers.slice(0, 5);
        return (
          <div className="space-y-2 max-h-[240px] overflow-y-auto">
            {sampleAnswers.map((answer, index) => (
              <div key={index} className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-foreground line-clamp-2">{answer}</p>
              </div>
            ))}
            {question.textAnswers.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{question.textAnswers.length - 5} more responses
              </p>
            )}
          </div>
        );

      case 'date_time':
        if (!question.aggregates || question.aggregates.length === 0) {
          return <p className="text-sm text-muted-foreground text-center py-8">No responses yet</p>;
        }

        return (
          <div className="space-y-2 max-h-[240px] overflow-y-auto">
            {question.aggregates.slice(0, 10).map((item, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-sm font-medium">{item.option}</span>
                <Badge variant="secondary">{item.count} responses</Badge>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-[240px]">
            <p className="text-sm text-muted-foreground">
              Visualization not available for this question type
            </p>
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base sm:text-lg line-clamp-2 flex-1">
            {question.questionTitle}
          </CardTitle>
          <Badge variant="outline" className="text-xs whitespace-nowrap">
            {question.questionType.replace(/_/g, ' ')}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
          <span>{question.totalResponses} responses</span>
          <span>{Math.round(question.answerRate)}% answered</span>
        </div>
      </CardHeader>
      <CardContent>
        {renderVisualization()}
      </CardContent>
    </Card>
  );
}
