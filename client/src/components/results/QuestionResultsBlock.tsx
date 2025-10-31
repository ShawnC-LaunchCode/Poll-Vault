import { QuestionSummaryCard } from "./QuestionSummaryCard";
import { IndividualAnswersList } from "./IndividualAnswersList";
import type { QuestionAnalytics } from "@shared/schema";

interface Answer {
  id: string;
  responseId: string;
  value: any;
  isAnonymous?: boolean;
  respondentName?: string;
  submittedAt?: string;
}

interface QuestionResultsBlockProps {
  question: QuestionAnalytics;
  individualAnswers: Answer[];
}

export function QuestionResultsBlock({ question, individualAnswers }: QuestionResultsBlockProps) {
  return (
    <div className="space-y-4">
      {/* Aggregated Results Card */}
      <QuestionSummaryCard question={question} />

      {/* Individual Answers List */}
      <IndividualAnswersList
        answers={individualAnswers}
        questionType={question.questionType}
        questionTitle={question.questionTitle}
      />
    </div>
  );
}
