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
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={currentPageIndex === 0}
        data-testid="button-previous"
        className="w-full sm:w-auto order-2 sm:order-1 h-11 text-sm sm:text-base"
      >
        Previous
      </Button>

      <Button
        onClick={onNext}
        disabled={!canProceed || isSubmitting}
        data-testid="button-next"
        className="w-full sm:w-auto order-1 sm:order-2 h-11 text-sm sm:text-base"
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></div>
            <span className="hidden sm:inline">Submitting...</span>
            <span className="sm:hidden">Sending...</span>
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
