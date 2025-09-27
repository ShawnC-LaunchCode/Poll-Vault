import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface QuestionRendererProps {
  question: {
    id: string;
    type: string;
    title: string;
    description?: string;
    required: boolean;
    options?: string[];
  };
  value?: any;
  onChange: (value: any) => void;
}

export default function QuestionRenderer({ question, value, onChange }: QuestionRendererProps) {
  const [fileUploads, setFileUploads] = useState<File[]>([]);

  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files);
      setFileUploads(fileArray);
      onChange(fileArray.map(f => ({ name: f.name, size: f.size, type: f.type })));
    }
  };

  const handleMultipleChoice = (optionValue: string, checked: boolean) => {
    const currentValues = Array.isArray(value) ? value : [];
    if (checked) {
      onChange([...currentValues, optionValue]);
    } else {
      onChange(currentValues.filter((v: string) => v !== optionValue));
    }
  };

  const renderInput = () => {
    switch (question.type) {
      case 'short_text':
        return (
          <Input
            placeholder="Your answer"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            data-testid={`input-question-${question.id}`}
          />
        );

      case 'long_text':
        return (
          <Textarea
            placeholder="Your answer"
            rows={4}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            data-testid={`textarea-question-${question.id}`}
          />
        );

      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:bg-accent cursor-pointer">
                <Checkbox
                  checked={Array.isArray(value) && value.includes(option)}
                  onCheckedChange={(checked) => handleMultipleChoice(option, !!checked)}
                  data-testid={`checkbox-question-${question.id}-option-${index}`}
                />
                <Label className="flex-1 cursor-pointer">{option}</Label>
              </div>
            ))}
          </div>
        );

      case 'radio':
        return (
          <RadioGroup
            value={value || ""}
            onValueChange={onChange}
            data-testid={`radio-group-question-${question.id}`}
          >
            <div className="space-y-3">
              {question.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:bg-accent cursor-pointer">
                  <RadioGroupItem 
                    value={option} 
                    id={`${question.id}-${index}`}
                    data-testid={`radio-question-${question.id}-option-${index}`}
                  />
                  <Label htmlFor={`${question.id}-${index}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        );

      case 'yes_no':
        return (
          <RadioGroup
            value={value || ""}
            onValueChange={onChange}
            data-testid={`yes-no-question-${question.id}`}
          >
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="yes" id={`${question.id}-yes`} />
                <Label htmlFor={`${question.id}-yes`} className="flex-1 cursor-pointer">Yes</Label>
              </div>
              <div className="flex items-center space-x-3 p-3 border border-border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="no" id={`${question.id}-no`} />
                <Label htmlFor={`${question.id}-no`} className="flex-1 cursor-pointer">No</Label>
              </div>
            </div>
          </RadioGroup>
        );

      case 'date_time':
        return (
          <Input
            type="datetime-local"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            data-testid={`datetime-question-${question.id}`}
          />
        );

      case 'file_upload':
        return (
          <div className="space-y-4">
            <Input
              type="file"
              multiple
              onChange={(e) => handleFileUpload(e.target.files)}
              data-testid={`file-question-${question.id}`}
            />
            {fileUploads.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Selected files:</p>
                {fileUploads.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm text-foreground">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="p-4 border border-destructive rounded-lg bg-destructive/10">
            <p className="text-sm text-destructive">Unsupported question type: {question.type}</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4" data-testid={`question-${question.id}`}>
      <div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          {question.title}
          {question.required && <span className="text-destructive ml-1">*</span>}
        </h3>
        {question.description && (
          <p className="text-sm text-muted-foreground mb-4">{question.description}</p>
        )}
      </div>

      {renderInput()}

      {question.required && (
        <div className="text-xs text-muted-foreground flex items-center">
          <i className="fas fa-asterisk mr-1"></i>
          Required question
        </div>
      )}
    </div>
  );
}
