import { EmptyState } from "@/components/shared/EmptyState";
import { AlertTriangle } from "lucide-react";

export function ErrorScreen() {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Survey Not Available"
      description="This survey link is invalid or has expired."
      iconColor="text-destructive"
      fullPage
    />
  );
}
