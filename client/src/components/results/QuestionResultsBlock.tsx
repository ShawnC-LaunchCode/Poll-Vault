import { QuestionSummaryCard } from "./QuestionSummaryCard";
import { IndividualAnswersList } from "./IndividualAnswersList";

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
