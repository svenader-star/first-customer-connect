import { useState, useRef, useEffect } from "react";
import { Plus, Mail, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Space } from "@/hooks/useSpaces";

interface AppSidebarProps {
  spaces: Space[];
  activeIndex: number;
  onActiveSpaceChange: (index: number) => void;
  onAddSpace: () => Promise<Space | null>;
  onRenameSpace: (id: string, name: string) => Promise<void>;
  onDeleteSpace: (id: string) => Promise<void>;
  onTemplatesClick: () => void;
}

export function AppSidebar({
  spaces,
  activeIndex,
  onActiveSpaceChange,
  onAddSpace,
  onRenameSpace,
  onDeleteSpace,
  onTemplatesClick,
}: AppSidebarProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingIndex !== null && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingIndex]);

  const startRename = (i: number) => {
    setEditingIndex(i);
    setEditValue(spaces[i].name);
  };

  const commitRename = () => {
    if (editingIndex !== null && editValue.trim()) {
      onRenameSpace(spaces[editingIndex].id, editValue.trim());
    }
    setEditingIndex(null);
  };

  const confirmDelete = () => {
    if (deleteIndex !== null) {
      onDeleteSpace(spaces[deleteIndex].id);
      if (activeIndex === deleteIndex) onActiveSpaceChange(0);
      else if (activeIndex > deleteIndex) onActiveSpaceChange(activeIndex - 1);
      setDeleteIndex(null);
    }
  };

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-secondary flex flex-col h-screen">
      <div className="px-4 py-5">
        <h1 className="text-base font-semibold text-foreground tracking-tight">First Customer</h1>
      </div>

      <div className="px-3 mb-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Spaces</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {(spaces || []).map((space, i) => (
          <div key={space.id} className="group relative flex items-center">
            {editingIndex === i ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setEditingIndex(null);
                }}
                className="w-full px-3 py-2 rounded-md text-sm bg-background border border-input outline-none"
              />
            ) : (
              <button
                onClick={() => onActiveSpaceChange(i)}
                onDoubleClick={() => startRename(i)}
                onContextMenu={(e) => { e.preventDefault(); startRename(i); }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  i === activeIndex
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                {space.name}
              </button>
            )}

            {editingIndex !== i && (
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteIndex(i); }}
                className="absolute right-1.5 hidden group-hover:flex items-center justify-center h-5 w-5 rounded text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}

        <button
          onClick={() => onAddSpace()}
          className="w-full text-left px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent flex items-center gap-2"
        >
          <Plus className="h-3.5 w-3.5" /> Add Space
        </button>
      </nav>

      <div className="p-3 border-t border-border">
        <Button variant="ghost" className="w-full justify-start gap-2 text-sm" onClick={onTemplatesClick}>
          <Mail className="h-4 w-4" /> Outreach Templates
        </Button>
      </div>

      <AlertDialog open={deleteIndex !== null} onOpenChange={() => setDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Space</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the Space "{deleteIndex !== null ? spaces[deleteIndex]?.name : ""}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
