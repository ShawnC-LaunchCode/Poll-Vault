import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useReorderPages } from '@/hooks/useReordering';
import type { SurveyPage } from '@shared/schema';

interface DraggablePageListProps {
  pages: SurveyPage[];
  surveyId: string;
  selectedPageId: string | null;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onDeletePage: (pageId: string) => void;
  onPagesReordered: (pages: SurveyPage[]) => void;
}

interface SortablePageItemProps {
  page: SurveyPage;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function SortablePageItem({ page, isSelected, onSelect, onDelete }: SortablePageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`mb-2 cursor-pointer transition-colors ${
        isSelected ? 'border-primary ring-2 ring-primary' : 'hover:border-gray-400'
      } ${isDragging ? 'shadow-lg' : ''}`}
      onClick={onSelect}
    >
      <CardContent className="flex items-center gap-3 p-3">
        {/* Drag Handle */}
        <button
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 focus:outline-none"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {/* Page Info */}
        <div className="flex-1">
          <div className="font-medium">{page.title || `Page ${page.order}`}</div>
          <div className="text-xs text-gray-500">Page {page.order}</div>
        </div>

        {/* Delete Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

export function DraggablePageList({
  pages,
  surveyId,
  selectedPageId,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onPagesReordered,
}: DraggablePageListProps) {
  const [localPages, setLocalPages] = React.useState(pages);
  const reorderPagesMutation = useReorderPages(surveyId);

  // Update local state when pages prop changes
  React.useEffect(() => {
    setLocalPages(pages);
  }, [pages]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = localPages.findIndex((p) => p.id === active.id);
    const newIndex = localPages.findIndex((p) => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Optimistic update
    const reorderedPages = arrayMove(localPages, oldIndex, newIndex);

    // Update order values to match new positions
    const pagesWithNewOrder = reorderedPages.map((page, index) => ({
      ...page,
      order: index + 1,
    }));

    setLocalPages(pagesWithNewOrder);
    onPagesReordered(pagesWithNewOrder);

    // Send to server
    try {
      await reorderPagesMutation.mutateAsync(
        pagesWithNewOrder.map((page) => ({
          id: page.id,
          order: page.order,
        }))
      );
    } catch (error) {
      // Revert on error
      setLocalPages(pages);
      onPagesReordered(pages);
      console.error('Failed to reorder pages:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Pages</h3>
        <Button onClick={onAddPage} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Page
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={localPages.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {localPages.map((page) => (
              <SortablePageItem
                key={page.id}
                page={page}
                isSelected={page.id === selectedPageId}
                onSelect={() => onSelectPage(page.id)}
                onDelete={() => onDeletePage(page.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {localPages.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No pages yet. Click "Add Page" to create your first page.
        </div>
      )}
    </div>
  );
}
