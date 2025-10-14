import { useState } from "react";

export function useRecipientSelection() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(recipientId => recipientId !== id)
        : [...prev, id]
    );
  };

  const toggleAll = (allIds: string[]) => {
    if (selectedIds.length === allIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allIds);
    }
  };

  const clear = () => setSelectedIds([]);

  const isSelected = (id: string) => selectedIds.includes(id);

  const isAllSelected = (allIds: string[]) =>
    allIds.length > 0 && selectedIds.length === allIds.length;

  return {
    selectedIds,
    toggle,
    toggleAll,
    clear,
    isSelected,
    isAllSelected,
    count: selectedIds.length,
  };
}
