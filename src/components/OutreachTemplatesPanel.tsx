import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OutreachTemplatesPanelProps {
  onClose: () => void;
}

type TemplateTab = "email" | "linkedin";

function TemplateFields() {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Task</Label>
        <Input placeholder="Write a short, high-quality cold email" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Goal</Label>
        <Input placeholder="Learn about [problem space]" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Tone</Label>
        <Input placeholder="Founder, curious, non-salesy" />
      </div>
    </div>
  );
}

export function OutreachTemplatesPanel({ onClose }: OutreachTemplatesPanelProps) {
  const [tab, setTab] = useState<TemplateTab>("email");

  const tabs: { key: TemplateTab; label: string }[] = [
    { key: "email", label: "Email" },
    { key: "linkedin", label: "LinkedIn" },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold text-foreground">Outreach Templates</h2>
      </div>

      <div className="flex items-center bg-muted rounded-full p-0.5 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
              tab === t.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <TemplateFields />

      <Button size="lg">Save Templates</Button>
    </div>
  );
}
