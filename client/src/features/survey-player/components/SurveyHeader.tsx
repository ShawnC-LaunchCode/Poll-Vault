import type { Survey } from "@shared/schema";

interface SurveyHeaderProps {
  survey: Survey;
}

export function SurveyHeader({ survey }: SurveyHeaderProps) {
  return (
    <div>
      <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2" data-testid="text-survey-title">
        {survey.title}
      </h1>
      {survey.description && (
        <p className="text-muted-foreground" data-testid="text-survey-description">
          {survey.description}
        </p>
      )}
    </div>
  );
}
