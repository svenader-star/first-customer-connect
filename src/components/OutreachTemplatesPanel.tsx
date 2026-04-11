import { useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useOutreachTemplates } from "@/hooks/useOutreachTemplates";

interface OutreachTemplatesPanelProps {
  onClose: () => void;
}

type TemplateTab = "email" | "linkedin";

function EmailTab({ templates, onAdd, onUpdate }: {
  templates: { id: string; template_number: number; subject_line: string; body: string }[];
  onAdd: () => void;
  onUpdate: (id: string, field: "subject_line" | "body", value: string) => void;
}) {
  return (
    <div className="space-y-4">
      {templates.map((t) => (
        <div key={t.id} className="border border-border rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Template {t.template_number}</h3>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Subject Line</Label>
            <Input
              placeholder="Enter email subject line…"
              value={t.subject_line}
              onChange={(e) => onUpdate(t.id, "subject_line", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Email Body</Label>
            <Textarea
              placeholder="Write your email body…"
              className="min-h-[140px]"
              value={t.body}
              onChange={(e) => onUpdate(t.id, "body", e.target.value)}
            />
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={onAdd} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" /> Add Template
      </Button>
    </div>
  );
}

function LinkedInTab({ templates, onAdd, onUpdate }: {
  templates: { id: string; template_number: number; subject_line: string; body: string }[];
  onAdd: () => void;
  onUpdate: (id: string, field: "subject_line" | "body", value: string) => void;
}) {
  return (
    <div className="space-y-4">
      {templates.map((t) => (
        <div key={t.id} className="border border-border rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">LinkedIn Template {t.template_number}</h3>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Message</Label>
            <Textarea
              placeholder="Write your LinkedIn message…"
              className="min-h-[160px]"
              value={t.body}
              onChange={(e) => onUpdate(t.id, "body", e.target.value)}
            />
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={onAdd} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" /> Add Template
      </Button>
    </div>
  );
}

export function OutreachTemplatesPanel({ onClose }: OutreachTemplatesPanelProps) {
  const [tab, setTab] = useState<TemplateTab>("email");
  const { templates, addTemplate, updateTemplate } = useOutreachTemplates();

  const emailTemplates = templates.filter((t) => t.type === "email");
  const linkedinTemplates = templates.filter((t) => t.type === "linkedin");

  const tabsList: { key: TemplateTab; label: string }[] = [
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
        {tabsList.map((t) => (
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

      {tab === "email" ? (
        <EmailTab
          templates={emailTemplates}
          onAdd={() => addTemplate("email", emailTemplates.length + 1)}
          onUpdate={updateTemplate}
        />
      ) : (
        <LinkedInTab
          templates={linkedinTemplates}
          onAdd={() => addTemplate("linkedin", linkedinTemplates.length + 1)}
          onUpdate={updateTemplate}
        />
      )}
    </div>
  );
}
