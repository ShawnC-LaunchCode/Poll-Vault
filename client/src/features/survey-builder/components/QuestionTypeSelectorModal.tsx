import {
  Type,
  AlignLeft,
  CheckSquare,
  Circle,
  ToggleLeft,
  Calendar,
  Upload,
  Repeat,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";

interface QuestionTypeSelectorModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: string) => void;
}

const questionTypes = [
  {
    value: "short_text",
    label: "Short Text",
    icon: <Type className="w-6 h-6" />,
    description: "Brief single-line text input",
  },
  {
    value: "long_text",
    label: "Long Text",
    icon: <AlignLeft className="w-6 h-6" />,
    description: "Multi-line text area",
  },
  {
    value: "multiple_choice",
    label: "Multiple Choice",
    icon: <CheckSquare className="w-6 h-6" />,
    description: "Select multiple options",
  },
  {
    value: "radio",
    label: "Radio",
    icon: <Circle className="w-6 h-6" />,
    description: "Select one option only",
  },
  {
    value: "yes_no",
    label: "Yes/No",
    icon: <ToggleLeft className="w-6 h-6" />,
    description: "Simple binary choice",
  },
  {
    value: "date_time",
    label: "Date/Time",
    icon: <Calendar className="w-6 h-6" />,
    description: "Date and time picker",
  },
  {
    value: "file_upload",
    label: "File Upload",
    icon: <Upload className="w-6 h-6" />,
    description: "Upload files or images",
  },
  {
    value: "loop_group",
    label: "Loop Group",
    icon: <Repeat className="w-6 h-6" />,
    description: "Repeating question set",
  },
];

export function QuestionTypeSelectorModal({
  open,
  onClose,
  onSelect,
}: QuestionTypeSelectorModalProps) {
  const handleSelect = (type: string) => {
    onSelect(type);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select Question Type</DialogTitle>
          <DialogDescription>
            Choose the type of question you want to add to this page
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 py-4">
          {questionTypes.map((type) => (
            <Card
              key={type.value}
              className="cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
              onClick={() => handleSelect(type.value)}
            >
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="text-blue-500 mb-3">{type.icon}</div>
                <h4 className="font-medium text-sm mb-1">{type.label}</h4>
                <p className="text-xs text-gray-500">{type.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
