import type { QuestionAggregate, YesNoAggregation, ChoiceAggregation, TextAggregation } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { YesNoChart } from './YesNoChart';
import { MultipleChoiceChart } from './MultipleChoiceChart';
import { KeywordList } from './KeywordList';

interface ResultsCardProps {
  question: QuestionAggregate;
}

function isYesNoAggregation(data: any): data is YesNoAggregation {
  return data && typeof data === 'object' && 'yes' in data && 'no' in data;
}

function isChoiceAggregation(data: any): data is ChoiceAggregation[] {
  return Array.isArray(data) && data.length > 0 && 'option' in data[0] && 'count' in data[0];
}

function isTextAggregation(data: any): data is TextAggregation {
  return data && typeof data === 'object' && 'topKeywords' in data && 'totalWords' in data;
}

export function ResultsCard({ question }: ResultsCardProps) {
  const renderChart = () => {
    // Handle no answers
    if (question.totalAnswers === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <p>No responses yet</p>
        </div>
      );
    }

    // Render based on question type and aggregation structure
    if (question.questionType === 'yes_no' && isYesNoAggregation(question.aggregation)) {
      return <YesNoChart data={question.aggregation} />;
    }

    if (
      (question.questionType === 'multiple_choice' || question.questionType === 'radio') &&
      isChoiceAggregation(question.aggregation)
    ) {
      return <MultipleChoiceChart data={question.aggregation} />;
    }

    if (
      (question.questionType === 'short_text' || question.questionType === 'long_text') &&
      isTextAggregation(question.aggregation)
    ) {
      return <KeywordList data={question.aggregation} />;
    }

    // Fallback for unsupported question types
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Visualization not available for this question type</p>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{question.questionTitle}</CardTitle>
        <CardDescription>
          {question.totalAnswers} {question.totalAnswers === 1 ? 'response' : 'responses'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
}
