import { Card, CardContent } from "@/components/ui/card";
import QuestionRenderer from "@/components/survey/QuestionRenderer";
import type { QuestionWithSubquestions } from "@shared/schema";

interface PageContentProps {
  pageTitle?: string;
  questions: QuestionWithSubquestions[];
  visibleQuestions: Record<string, boolean>;
  answers: Record<string, any>;
  answerIds: Record<string, string>;
  onAnswerChange: (questionId: string, value: any) => void;
  onQuestionFocus: (questionId: string) => void;
  onQuestionBlur: (questionId: string) => void;
}

export function PageContent({
  pageTitle,
  questions,
  visibleQuestions,
  answers,
  answerIds,
  onAnswerChange,
  onQuestionFocus,
  onQuestionBlur
}: PageContentProps) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-4 sm:space-y-6">
          {pageTitle && (
            <h2 className="text-base sm:text-lg font-semibold text-foreground" data-testid="text-page-title">
              {pageTitle}
            </h2>
          )}

          {questions
            .filter(question => visibleQuestions[question.id] !== false)
            .map((question) => (
              <QuestionRenderer
                key={question.id}
                question={{
                  ...question,
                  description: question.description || undefined,
                  required: question.required ?? false,
                  options: question.type === 'file_upload' ? question.options : (Array.isArray(question.options) ? question.options : undefined),
                  loopConfig: question.loopConfig as any,
                  subquestions: question.subquestions?.map(sq => ({
                    ...sq,
                    description: sq.description || undefined,
                    required: sq.required ?? false
                  })) || undefined
                } as any}
                value={answers[question.id]}
                onChange={(value) => onAnswerChange(question.id, value)}
                onFocus={() => onQuestionFocus(question.id)}
                onBlur={() => onQuestionBlur(question.id)}
                answerId={answerIds[question.id]}
              />
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
