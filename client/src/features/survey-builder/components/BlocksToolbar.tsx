import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BlocksToolbarProps {
  allCollapsed: boolean;
  filterText: string;
  onToggleCollapseAll: () => void;
  onFilterChange: (text: string) => void;
}

export function BlocksToolbar({
  allCollapsed,
  filterText,
  onToggleCollapseAll,
  onFilterChange,
}: BlocksToolbarProps) {
  return (
    <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b">
      {/* LEFT - Collapse/Expand All */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleCollapseAll}
        className="gap-2"
      >
        {allCollapsed ? (
          <>
            <ChevronRight className="w-4 h-4" />
            Expand All Blocks
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            Collapse All Blocks
          </>
        )}
      </Button>

      {/* RIGHT - Filter Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Filter blocks by page or question..."
          value={filterText}
          onChange={(e) => onFilterChange(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
}
