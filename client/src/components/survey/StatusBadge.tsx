import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Circle, CheckCircle2, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status: "draft" | "open" | "closed";
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const statusConfig = {
    draft: {
      label: "Draft",
      variant: "secondary" as const,
      icon: Circle,
      className: "bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300",
    },
    open: {
      label: "Open",
      variant: "default" as const,
      icon: CheckCircle2,
      className: "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400",
    },
    closed: {
      label: "Closed",
      variant: "destructive" as const,
      icon: XCircle,
      className: "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {showIcon && <Icon className="mr-1 h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
