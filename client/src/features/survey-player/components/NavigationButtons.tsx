import { Button } from "@/components/ui/button";

interface NavigationButtonsProps {
  currentPageIndex: number;
  totalPages: number;
  canProceed: boolean;
  isSubmitting: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function NavigationButtons({
  currentPageIndex,
  totalPages,
  canProceed,
  isSubmitting,
  onPrevious,
  onNext
}: NavigationButtonsProps) {
  const isLastPage = currentPageIndex === totalPages - 1;

  return (
    <div className="flex items-center justify-between">
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={currentPageIndex === 0}
        data-testid="button-previous"
      >
        Previous
      </Button>

      <Button
        onClick={onNext}
        disabled={!canProceed || isSubmitting}
        data-testid="button-next"
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></div>
            Submitting...
          </>
        ) : isLastPage ? (
          "Submit"
        ) : (
          "Next"
        )}
      </Button>
    </div>
  );
}
