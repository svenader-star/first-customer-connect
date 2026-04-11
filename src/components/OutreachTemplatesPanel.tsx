import { useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface OutreachTemplatesPanelProps {
  onClose: () => void;
}

type TemplateTab = "email" | "linkedin";

/* ─── Email Tab ─── */

function EmailTab() {
  const [count, setCount] = useState(1);

  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="border border-border rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Template {i + 1}</h3>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Subject Line</Label>
            <Input placeholder="Enter email subject line…" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Email Body</Label>
            <Textarea placeholder="Write your email body…" className="min-h-[140px]" />
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => setCount((c) => c + 1)} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" /> Add Template
      </Button>
    </div>
  );
}

/* ─── LinkedIn Tab ─── */

function ConnectionRequestCard({ index }: { index: number }) {
  const [value, setValue] = useState("");
  const max = 200;

  return (
    <div className="border border-border rounded-lg p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Connection Request Template {index}</h3>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Message</Label>
        <Textarea
          placeholder="Write a connection request message…"
          className="min-h-[80px]"
          maxLength={max}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <p className="text-xs text-muted-foreground text-right">
          {value.length}/{max} characters
        </p>
      </div>
    </div>
  );
}

function LinkedInMessageCard({ index }: { index: number }) {
  return (
    <div className="border border-border rounded-lg p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">LinkedIn Message Template {index}</h3>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Message</Label>
        <Textarea placeholder="Write your LinkedIn message…" className="min-h-[160px]" />
      </div>
    </div>
  );
}

function LinkedInTab() {
  const [connCount, setConnCount] = useState(1);
  const [msgCount, setMsgCount] = useState(1);

  return (
    <div className="space-y-6">
      {/* Connection Requests */}
      <div className="space-y-4">
        {Array.from({ length: connCount }, (_, i) => (
          <ConnectionRequestCard key={i} index={i + 1} />
        ))}
        <Button variant="outline" size="sm" onClick={() => setConnCount((c) => c + 1)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Template
        </Button>
      </div>

      {/* LinkedIn Messages */}
      <div className="space-y-4">
        {Array.from({ length: msgCount }, (_, i) => (
          <LinkedInMessageCard key={i} index={i + 1} />
        ))}
        <Button variant="outline" size="sm" onClick={() => setMsgCount((c) => c + 1)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Template
        </Button>
      </div>
    </div>
  );
}

/* ─── Main Panel ─── */

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

      {tab === "email" ? <EmailTab /> : <LinkedInTab />}

      <Button size="lg">Save Templates</Button>
    </div>
  );
}
