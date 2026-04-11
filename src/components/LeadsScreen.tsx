import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import type { DbLead } from "@/hooks/useLeads";

function EditableCell({ value, onSave, className }: { value: string; onSave: (v: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setText(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => { onSave(text); setEditing(false); }}
        onKeyDown={(e) => { if (e.key === "Enter") { onSave(text); setEditing(false); } }}
        className="h-7 text-sm px-1 py-0"
      />
    );
  }

  return (
    <span className={className} onDoubleClick={() => setEditing(true)} style={{ cursor: "default" }}>
      {value}
    </span>
  );
}

function CopyButton({ getText }: { getText: () => string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-muted-foreground hover:text-foreground"
      onClick={() => { navigator.clipboard.writeText(getText()); toast.success("Copied to clipboard"); }}
    >
      <Copy className="h-3.5 w-3.5 mr-1" /> Copy
    </Button>
  );
}

type EditableField = "company" | "website" | "person" | "title" | "email" | "linkedin" | "source";

interface LeadsScreenProps {
  leads: DbLead[];
  onUpdateLead: (id: string, field: keyof DbLead, value: string | boolean) => void;
}

export function LeadsScreen({ leads, onUpdateLead }: LeadsScreenProps) {
  return (
    <div className="p-6 min-w-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Leads</h2>
      </div>

      <div className="border border-border rounded-lg overflow-x-auto">
        <Table className="min-w-[1100px]">
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Person</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>LinkedIn</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-center">Email Sent</TableHead>
              <TableHead className="text-center">LinkedIn Sent</TableHead>
              <TableHead className="text-center">Follow-up Sent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  No leads yet. Use the Setup tab to find leads.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((l) => (
                <TableRow key={l.id}>
                  {(["company", "website", "person", "title", "email", "linkedin", "source"] as EditableField[]).map((field) => (
                    <TableCell
                      key={field}
                      className={
                        field === "company" ? "font-medium" :
                        field === "email" || field === "linkedin" ? "text-muted-foreground text-xs" :
                        field === "website" || field === "title" ? "text-muted-foreground" : ""
                      }
                    >
                      <EditableCell value={l[field]} onSave={(v) => onUpdateLead(l.id, field, v)} />
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    <Checkbox checked={l.email_sent} onCheckedChange={() => onUpdateLead(l.id, "email_sent", !l.email_sent)} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox checked={l.linkedin_sent} onCheckedChange={() => onUpdateLead(l.id, "linkedin_sent", !l.linkedin_sent)} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox checked={l.followup_sent} onCheckedChange={() => onUpdateLead(l.id, "followup_sent", !l.followup_sent)} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
