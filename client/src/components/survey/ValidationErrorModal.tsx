import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
  questionId?: string;
  pageId?: string;
}

interface ValidationErrorModalProps {
  open: boolean;
  errors: ValidationError[];
  onClose: () => void;
  onErrorClick?: (error: ValidationError) => void;
}

export function ValidationErrorModal({
  open,
  errors,
  onClose,
  onErrorClick,
}: ValidationErrorModalProps) {
  const errorCount = errors.filter(e => e.severity === "error").length;
  const warningCount = errors.filter(e => e.severity === "warning").length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            Cannot Activate Survey
          </DialogTitle>
          <DialogDescription>
            Please fix the following issues before activating your survey
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Summary */}
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
            <div>
              <p className="font-medium text-red-900">Validation Failed</p>
              <p className="text-sm text-red-700">
                Your survey has issues that need to be resolved
              </p>
            </div>
            <div className="flex gap-2">
              {errorCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errorCount} {errorCount === 1 ? "Error" : "Errors"}
                </Badge>
              )}
            </div>
          </div>

          {/* Error List */}
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {errors.map((error, index) => (
                <Alert
                  key={`error-${index}`}
                  variant="destructive"
                  className={onErrorClick && error.questionId ? "cursor-pointer hover:bg-red-100" : ""}
                  onClick={() => {
                    if (onErrorClick && error.questionId) {
                      onErrorClick(error);
                    }
                  }}
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>{error.message}</span>
                    {onErrorClick && error.questionId && (
                      <span className="text-xs text-red-600 font-medium ml-2">
                        Click to jump →
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </ScrollArea>

          {/* Help Text */}
          <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Common issues:</strong>
            </p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
              <li>Question titles that are empty or use placeholder text</li>
              <li>Multiple choice/radio options that are empty or use default text like "Option 1"</li>
              <li>Missing question configurations</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>
            Close and Fix Issues
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
