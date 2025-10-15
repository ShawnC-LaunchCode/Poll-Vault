interface LoadingStateProps {
  message?: string;
  fullPage?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-12 h-12"
};

export function LoadingState({
  message = "Loading...",
  fullPage = false,
  size = "md"
}: LoadingStateProps) {
  const spinnerSize = sizeClasses[size];

  const content = (
    <div className="text-center">
      <div className={`${spinnerSize} border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4`}></div>
      <p className="text-muted-foreground">{message}</p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      {content}
    </div>
  );
}
