import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { Loader2, AlertCircle, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

interface PublishChecklistModalProps {
  surveyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PublishChecklistModal({
  surveyId,
  open,
  onOpenChange,
  onSuccess,
}: PublishChecklistModalProps) {
  const { toast } = useToast();
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Validate survey when modal opens
  useEffect(() => {
    if (open && surveyId) {
      validateSurvey();
    }
  }, [open, surveyId]);

  const validateSurvey = async () => {
    setIsValidating(true);
    try {
      const response = await apiRequest("GET", `/api/surveys/${surveyId}/validate`);
      const data = await response.json();
      setValidation(data);
    } catch (error) {
      toast({
        title: "Validation Failed",
        description: error instanceof Error ? error.message : "Failed to validate survey",
        variant: "destructive",
      });
      onOpenChange(false);
    } finally {
      setIsValidating(false);
    }
  };

  const publishMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PUT", `/api/surveys/${surveyId}/status`, {
        status: "open",
      });
    },
    onSuccess: async () => {
      toast({
        title: "Survey Published",
        description: "Your survey is now open for responses",
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Publishing Failed",
        description: error instanceof Error ? error.message : "Failed to publish survey",
        variant: "destructive",
      });
    },
  });

  const handlePublish = () => {
    if (validation?.valid) {
      publishMutation.mutate();
    }
  };

  const handleClose = () => {
    if (!publishMutation.isPending) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Publish Survey Checklist</DialogTitle>
          <DialogDescription>
            Review the validation results before publishing your survey
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isValidating ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Validating survey...</span>
            </div>
          ) : validation ? (
            <>
              {/* Status Summary */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  {validation.valid ? (
                    <>
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                      <div>
                        <p className="font-medium">Ready to Publish</p>
                        <p className="text-sm text-muted-foreground">
                          Your survey passed all validation checks
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-6 w-6 text-red-600" />
                      <div>
                        <p className="font-medium">Cannot Publish</p>
                        <p className="text-sm text-muted-foreground">
                          Please fix the errors below before publishing
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  {validation.errors.length > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validation.errors.length} {validation.errors.length === 1 ? "Error" : "Errors"}
                    </Badge>
                  )}
                  {validation.warnings.length > 0 && (
                    <Badge variant="outline" className="gap-1 bg-yellow-50 text-yellow-700 border-yellow-300">
                      <AlertTriangle className="h-3 w-3" />
                      {validation.warnings.length} {validation.warnings.length === 1 ? "Warning" : "Warnings"}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Validation Issues */}
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-3">
                  {/* Errors */}
                  {validation.errors.map((error, index) => (
                    <Alert key={`error-${index}`} variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <span className="font-medium">{error.field}:</span> {error.message}
                      </AlertDescription>
                    </Alert>
                  ))}

                  {/* Warnings */}
                  {validation.warnings.map((warning, index) => (
                    <Alert key={`warning-${index}`} className="border-yellow-300 bg-yellow-50/50">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        <span className="font-medium">{warning.field}:</span> {warning.message}
                      </AlertDescription>
                    </Alert>
                  ))}

                  {/* Success Message */}
                  {validation.valid && validation.errors.length === 0 && validation.warnings.length === 0 && (
                    <Alert className="border-green-300 bg-green-50/50">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        All validation checks passed! Your survey is ready to be published.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </ScrollArea>

              {/* Publishing Info */}
              {validation.valid && (
                <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Note:</strong> Once published, your survey will be marked as "Open" and
                    respondents will be able to submit responses. You can close the survey at any time.
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={publishMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={!validation?.valid || publishMutation.isPending || isValidating}
          >
            {publishMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              "Publish Survey"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
