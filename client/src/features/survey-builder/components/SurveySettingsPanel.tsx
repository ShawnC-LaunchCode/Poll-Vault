import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AnonymousAccessCard } from "./AnonymousAccessCard";

interface SurveyData {
  title: string;
  description: string;
  status: "draft" | "open" | "closed";
}

interface AnonymousSettings {
  enabled: boolean;
  accessType: string;
  publicLink?: string;
}

interface SurveySettingsPanelProps {
  surveyData: SurveyData;
  anonymousSettings: AnonymousSettings;
  surveyId: string | null;
  isEnabling: boolean;
  isDisabling: boolean;
  onSurveyDataChange: (data: SurveyData) => void;
  onToggleAnonymous: (enabled: boolean) => void;
  onAccessTypeChange: (accessType: string) => void;
}

export function SurveySettingsPanel({
  surveyData,
  anonymousSettings,
  surveyId,
  isEnabling,
  isDisabling,
  onSurveyDataChange,
  onToggleAnonymous,
  onAccessTypeChange
}: SurveySettingsPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Survey Title</label>
        <Input
          placeholder="Enter survey title"
          value={surveyData.title}
          onChange={(e) => onSurveyDataChange({ ...surveyData, title: e.target.value })}
          data-testid="input-survey-title"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Description</label>
        <Textarea
          placeholder="Enter survey description"
          rows={3}
          value={surveyData.description}
          onChange={(e) => onSurveyDataChange({ ...surveyData, description: e.target.value })}
          data-testid="textarea-survey-description"
        />
      </div>

      <AnonymousAccessCard
        surveyId={surveyId}
        anonymousSettings={anonymousSettings}
        isEnabling={isEnabling}
        isDisabling={isDisabling}
        onToggle={onToggleAnonymous}
        onAccessTypeChange={onAccessTypeChange}
      />
    </div>
  );
}
