import { Card, CardContent } from "@/components/ui/card";

interface AlreadyCompletedScreenProps {
  submittedAt?: string;
}

export function AlreadyCompletedScreen({ submittedAt }: AlreadyCompletedScreenProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2" data-testid="text-already-completed-title">
            Thank You!
          </h1>
          <p className="text-muted-foreground mb-4" data-testid="text-already-completed-message">
            You have already completed this survey. We appreciate your time and feedback.
          </p>
          {submittedAt && (
            <p className="text-sm text-muted-foreground" data-testid="text-submitted-date">
              Submitted on {new Date(submittedAt).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function SubmittedScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 text-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-check text-success text-2xl"></i>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Thank You!</h1>
          <p className="text-muted-foreground">
            Your response has been submitted successfully. We appreciate your time and feedback.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
