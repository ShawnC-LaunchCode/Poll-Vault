import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface HeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export default function Header({ title, description, actions }: HeaderProps) {
  return (
    <header className="bg-card border-b border-border px-6 py-4" data-testid="header">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-header-title">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1" data-testid="text-header-description">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-3" data-testid="header-actions">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
