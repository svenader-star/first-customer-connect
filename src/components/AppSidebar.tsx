import { useState } from "react";
import { Plus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  onTemplatesClick: () => void;
}

export function AppSidebar({ onTemplatesClick }: AppSidebarProps) {
  const [spaces, setSpaces] = useState([
    "Space 1", "Space 2", "Space 3", "Space 4", "Space 5", "Space 6",
  ]);
  const [active, setActive] = useState(0);

  const addSpace = () => {
    setSpaces((s) => [...s, `Space ${s.length + 1}`]);
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
        {spaces.map((name, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              i === active
                ? "bg-primary text-primary-foreground font-medium"
                : "text-foreground hover:bg-accent"
            }`}
          >
            {name}
          </button>
        ))}

        <button
          onClick={addSpace}
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
    </aside>
  );
}
