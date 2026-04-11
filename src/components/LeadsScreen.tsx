import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Copy, Loader2, Sparkles, Plus } from "lucide-react";
import { toast } from "sonner";
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
import { supabase } from "@/integrations/supabase/client";
import type { DbLead } from "@/hooks/useLeads";
import type { OutreachSettings } from "@/hooks/useOutreachSettings";
import type { OutreachTemplate } from "@/hooks/useOutreachTemplates";
import type { SetupFormState } from "@/components/SetupScreen";

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
      {value || "\u00A0"}
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
type ModalType = "email" | "linkedin" | "followup";

interface ModalState {
  leadId: string;
  type: ModalType;
  person: string;
}

interface LeadsScreenProps {
  leads: DbLead[];
  onUpdateLead: (id: string, field: keyof DbLead, value: string | boolean) => void;
  onAppendLeads: (leads: any[]) => Promise<void>;
  setupForm: SetupFormState;
  outreachSettings: OutreachSettings;
  templates: OutreachTemplate[];
}

export function LeadsScreen({ leads, onUpdateLead, onAppendLeads, setupForm, outreachSettings, templates }: LeadsScreenProps) {
  const [modal, setModal] = useState<ModalState | null>(null);
  const [generating, setGenerating] = useState(false);
  const [findingLeads, setFindingLeads] = useState(false);
  const currentLead = modal ? leads.find((l) => l.id === modal.leadId) : null;

  const modalTitle = modal
    ? modal.type === "email" ? `Email Draft — ${modal.person}`
    : modal.type === "linkedin" ? `LinkedIn Draft — ${modal.person}`
    : `Follow-up Draft — ${modal.person}`
    : "";

  const handleGenerate = async () => {
    if (!currentLead || !modal) return;
    setGenerating(true);

    const isLinkedin = modal.type === "linkedin";
    const outreach = {
      task: isLinkedin ? outreachSettings.linkedinTask : outreachSettings.emailTask,
      goal: isLinkedin ? outreachSettings.linkedinGoal : outreachSettings.emailGoal,
      tone: isLinkedin ? outreachSettings.linkedinTone : outreachSettings.emailTone,
    };

    try {
      const { data, error } = await supabase.functions.invoke("draft-message", {
        body: {
          lead: {
            person: currentLead.person,
            company: currentLead.company,
            title: currentLead.title,
            website: currentLead.website,
          },
          draftType: modal.type,
          outreachSettings: outreach,
          templates,
        },
      });

      if (error) throw error;

      if (modal.type === "linkedin") {
        if (data.message) onUpdateLead(currentLead.id, "linkedin_draft_body", data.message);
      } else if (modal.type === "email") {
        if (data.subjectLine) onUpdateLead(currentLead.id, "email_draft_subject", data.subjectLine);
        if (data.body) onUpdateLead(currentLead.id, "email_draft_body", data.body);
      } else {
        if (data.subjectLine) onUpdateLead(currentLead.id, "followup_draft_subject", data.subjectLine);
        if (data.body) onUpdateLead(currentLead.id, "followup_draft_body", data.body);
      }

      toast.success("Draft generated!");
    } catch (e) {
      console.error("Draft generation error:", e);
      toast.error("Failed to generate draft");
    } finally {
      setGenerating(false);
    }
  };

  const handleAddLeads = async () => {
    if (!setupForm.icpDescription || !setupForm.company1 || !setupForm.company2 || !setupForm.company3 || !setupForm.role) {
      toast.error("Please fill in the Setup tab first before adding more leads.");
      return;
    }
    setFindingLeads(true);
    try {
      const existingCompanies = leads.map((l) => l.company).filter(Boolean);
      const { data, error } = await supabase.functions.invoke("find-leads", {
        body: {
          icpDescription: setupForm.icpDescription,
          exampleCompanies: [setupForm.company1, setupForm.company2, setupForm.company3],
          role: setupForm.role,
          geography: setupForm.geo,
          excludeCompanies: existingCompanies,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await onAppendLeads(data.leads);
      toast.success(`Found ${data.leads.length} new leads!`);
    } catch (err: any) {
      console.error("Add leads error:", err);
      toast.error(err.message || "Failed to find new leads");
    } finally {
      setFindingLeads(false);
    }
  };

  return (
    <div className="p-6 min-w-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Leads</h2>
        <Button size="sm" onClick={handleAddLeads} disabled={findingLeads}>
          {findingLeads ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Finding Leads…</>
          ) : (
            <><Plus className="h-4 w-4 mr-1" /> Add Leads</>
          )}
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-x-auto">
        <Table className="min-w-[1400px]">
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Person</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>LinkedIn</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-center">Email Draft</TableHead>
              <TableHead className="text-center">LinkedIn Draft</TableHead>
              <TableHead className="text-center">Follow-up Draft</TableHead>
              <TableHead className="text-center">Email Sent</TableHead>
              <TableHead className="text-center">LinkedIn Sent</TableHead>
              <TableHead className="text-center">Follow-up Sent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
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
                    <Button variant="outline" size="sm" onClick={() => setModal({ leadId: l.id, type: "email", person: l.person })}>View</Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="outline" size="sm" onClick={() => setModal({ leadId: l.id, type: "linkedin", person: l.person })}>View</Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="outline" size="sm" onClick={() => setModal({ leadId: l.id, type: "followup", person: l.person })}>View</Button>
                  </TableCell>
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

      <Dialog open={!!modal} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-lg bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{modalTitle}</DialogTitle>
          </DialogHeader>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Generate with AI</>
            )}
          </Button>

          {currentLead && modal?.type === "email" && (
            <div className="space-y-4 mt-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-sm font-medium">Subject Line</Label>
                  <CopyButton getText={() => currentLead.email_draft_subject} />
                </div>
                <Input
                  value={currentLead.email_draft_subject}
                  onChange={(e) => onUpdateLead(currentLead.id, "email_draft_subject", e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-sm font-medium">Email Body</Label>
                  <CopyButton getText={() => currentLead.email_draft_body} />
                </div>
                <Textarea
                  value={currentLead.email_draft_body}
                  onChange={(e) => onUpdateLead(currentLead.id, "email_draft_body", e.target.value)}
                  className="min-h-[200px]"
                />
              </div>
            </div>
          )}

          {currentLead && modal?.type === "linkedin" && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <Label className="text-sm font-medium">LinkedIn Message</Label>
                <CopyButton getText={() => currentLead.linkedin_draft_body} />
              </div>
              <Textarea
                value={currentLead.linkedin_draft_body}
                onChange={(e) => onUpdateLead(currentLead.id, "linkedin_draft_body", e.target.value)}
                className="min-h-[150px]"
              />
            </div>
          )}

          {currentLead && modal?.type === "followup" && (
            <div className="space-y-4 mt-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-sm font-medium">Subject Line</Label>
                  <CopyButton getText={() => currentLead.followup_draft_subject} />
                </div>
                <Input
                  value={currentLead.followup_draft_subject}
                  onChange={(e) => onUpdateLead(currentLead.id, "followup_draft_subject", e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-sm font-medium">Follow-up Body</Label>
                  <CopyButton getText={() => currentLead.followup_draft_body} />
                </div>
                <Textarea
                  value={currentLead.followup_draft_body}
                  onChange={(e) => onUpdateLead(currentLead.id, "followup_draft_body", e.target.value)}
                  className="min-h-[200px]"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
