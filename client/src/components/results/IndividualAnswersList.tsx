import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, Globe, Calendar, FileText } from "lucide-react";

interface Answer {
  id: string;
  responseId: string;
  value: any;
  isAnonymous?: boolean;
  respondentName?: string;
  submittedAt?: string;
}

interface IndividualAnswersListProps {
  answers: Answer[];
  questionType: string;
  questionTitle: string;
}

export function IndividualAnswersList({ answers, questionType, questionTitle }: IndividualAnswersListProps) {
  if (!answers || answers.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No individual responses yet</p>
        </CardContent>
      </Card>
    );
  }

  const formatAnswerValue = (value: any, type: string) => {
    if (value === null || value === undefined) return "No answer";

    if (typeof value === 'object') {
      // Handle array of selected options for multiple choice
      if (Array.isArray(value)) {
        return value.join(", ");
      }
      // Handle JSON objects
      return JSON.stringify(value);
    }

    if (type === 'date_time' && value) {
      return new Date(value).toLocaleString();
    }

    return String(value);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Individual Responses ({answers.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {answers.map((answer, index) => (
            <div
              key={answer.id}
              className="border-b border-border pb-3 last:border-0 last:pb-0"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {answer.isAnonymous ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex-shrink-0">
                      <Globe className="h-3 w-3 mr-1" />
                      Anonymous
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex-shrink-0">
                      <UserCheck className="h-3 w-3 mr-1" />
                      {answer.respondentName || "User"}
                    </Badge>
                  )}
                  {answer.submittedAt && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                      <Calendar className="h-3 w-3" />
                      {new Date(answer.submittedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <code className="text-xs bg-muted px-2 py-0.5 rounded flex-shrink-0">
                  #{answer.responseId.slice(-6)}
                </code>
              </div>

              <div className="pl-0 sm:pl-2">
                {questionType === 'long_text' ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                    {formatAnswerValue(answer.value, questionType)}
                  </p>
                ) : (
                  <p className="text-sm text-foreground break-words">
                    {formatAnswerValue(answer.value, questionType)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
