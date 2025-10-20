import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Keyboard } from "lucide-react";
import { getModifierKey } from "@/hooks/useKeyboardShortcuts";

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    keys: string;
    description: string;
  }>;
}

export function KeyboardShortcutsHelp({ open, onClose }: KeyboardShortcutsHelpProps) {
  const modKey = getModifierKey();

  const shortcutGroups: ShortcutGroup[] = [
    {
      title: "General",
      shortcuts: [
        { keys: `${modKey} + S`, description: "Save survey" },
        { keys: `${modKey} + P`, description: "Preview survey" },
        { keys: `${modKey} + K`, description: "Show keyboard shortcuts" },
        { keys: "Escape", description: "Close modals/dialogs" },
      ],
    },
    {
      title: "Pages & Questions",
      shortcuts: [
        { keys: `${modKey} + N`, description: "Add new page" },
        { keys: `${modKey} + D`, description: "Duplicate selected item" },
        { keys: "Delete", description: "Delete selected item" },
      ],
    },
    {
      title: "Navigation",
      shortcuts: [
        { keys: `${modKey} + F`, description: "Focus filter/search" },
        { keys: `${modKey} + 1`, description: "Switch to Blocks tab" },
        { keys: `${modKey} + 2`, description: "Switch to Templates tab" },
        { keys: `${modKey} + 3`, description: "Switch to Publish tab" },
        { keys: `${modKey} + 4`, description: "Switch to Settings tab" },
      ],
    },
    {
      title: "View",
      shortcuts: [
        { keys: `${modKey} + [`, description: "Collapse all pages" },
        { keys: `${modKey} + ]`, description: "Expand all pages" },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </div>
          <DialogDescription>
            Use these keyboard shortcuts to work faster in the survey builder
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {shortcutGroups.map((group) => (
            <Card key={group.title}>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3">{group.title}</h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.keys}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-600">{shortcut.description}</span>
                      <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
                        {shortcut.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-xs text-gray-500 text-center">
          Press <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono">Escape</kbd> to close this dialog
        </div>
      </DialogContent>
    </Dialog>
  );
}
