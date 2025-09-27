interface ProgressBarProps {
  current: number;
  total: number;
  percentage: number;
}

export default function ProgressBar({ current, total, percentage }: ProgressBarProps) {
  return (
    <div className="bg-card px-4 py-2 border-b border-border" data-testid="progress-bar">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span data-testid="text-progress-current">Question {current} of {total}</span>
        <span data-testid="text-progress-percentage">{Math.round(percentage)}% Complete</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-300 ease-out" 
          style={{ width: `${percentage}%` }}
          data-testid="progress-bar-fill"
        />
      </div>
    </div>
  );
}
