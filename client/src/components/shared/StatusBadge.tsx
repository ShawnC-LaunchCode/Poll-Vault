import { Badge } from "@/components/ui/badge";

type SurveyStatus = "draft" | "open" | "closed" | "active";

interface StatusBadgeProps {
  status: SurveyStatus | string;
  customLabels?: Record<string, string>;
}

export function StatusBadge({ status, customLabels }: StatusBadgeProps) {
  const getStatusDisplay = () => {
    // Use custom label if provided
    if (customLabels && customLabels[status]) {
      return customLabels[status];
    }

    // Default labels
    switch (status) {
      case 'active':
      case 'open':
        return 'Active';
      case 'draft':
        return 'Draft';
      case 'closed':
        return 'Closed';
      default:
        return status;
    }
  };

  const getStatusVariant = () => {
    switch (status) {
      case 'active':
      case 'open':
        return <Badge className="bg-success/10 text-success hover:bg-success/20">{getStatusDisplay()}</Badge>;
      case 'draft':
        return <Badge className="bg-warning/10 text-warning hover:bg-warning/20">{getStatusDisplay()}</Badge>;
      case 'closed':
        return <Badge variant="secondary">{getStatusDisplay()}</Badge>;
      default:
        return <Badge variant="secondary">{getStatusDisplay()}</Badge>;
    }
  };

  return getStatusVariant();
}
