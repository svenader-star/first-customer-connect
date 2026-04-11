import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Copy, Loader2, Sparkles, Plus, ChevronDown, Search, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { supabase } from "@/integrations/supabase/client";
import type { DbLead } from "@/hooks/useLeads";
import type { OutreachSettings } from "@/hooks/useOutreachSettings";
import type { OutreachTemplate } from "@/hooks/useOutreachTemplates";
import type { SetupFormState } from "@/components/SetupScreen";

function EditableCell({ value, onSave, className, renderDisplay }: { value: string; onSave: (v: string) => void; className?: string; renderDisplay?: (val: string, onEdit: () => void) => React.ReactNode }) {
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

  if (renderDisplay) {
    return <>{renderDisplay(value, () => setEditing(true))}</>;
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
  onDeleteLeads: (ids: string[]) => Promise<void>;
  setupForm: SetupFormState;
  outreachSettings: OutreachSettings;
  templates: OutreachTemplate[];
}

export function LeadsScreen({ leads, onUpdateLead, onAppendLeads, onDeleteLeads, setupForm, outreachSettings, templates }: LeadsScreenProps) {
  const [modal, setModal] = useState<ModalState | null>(null);
  const [generating, setGenerating] = useState(false);
  const [findingLeads, setFindingLeads] = useState(false);
  const [manualRow, setManualRow] = useState<Record<EditableField, string> | null>(null);
  const manualRowRef = useRef<HTMLTableRowElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

  const handleAddManualRow = () => {
    setManualRow({ company: "", website: "", person: "", title: "", email: "", linkedin: "", source: "" });
  };

  const handleSaveManualRow = async () => {
    if (!manualRow) return;
    const hasData = Object.values(manualRow).some((v) => v.trim() !== "");
    if (hasData) {
      await onAppendLeads([manualRow]);
      toast.success("Lead added!");
    }
    setManualRow(null);
  };

  useEffect(() => {
    if (!manualRow) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (manualRowRef.current && !manualRowRef.current.contains(e.target as Node)) {
        handleSaveManualRow();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [manualRow]);

  return (
    <div className="p-6 min-w-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">Leads</h2>
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                await onDeleteLeads(Array.from(selectedIds));
                setSelectedIds(new Set());
                toast.success(`Deleted ${selectedIds.size} lead(s)`);
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete ({selectedIds.size})
            </Button>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" disabled={findingLeads}>
              {findingLeads ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Finding Leads…</>
              ) : (
                <><Plus className="h-4 w-4 mr-1" /> Add Leads <ChevronDown className="h-3.5 w-3.5 ml-1" /></>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleAddLeads} disabled={findingLeads}>
              <Search className="h-4 w-4 mr-2" /> Generate More Leads
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddManualRow}>
              <UserPlus className="h-4 w-4 mr-2" /> Add Lead Manually
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="border border-border rounded-lg overflow-x-auto">
        <Table className="min-w-[1400px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={leads.length > 0 && selectedIds.size === leads.length}
                  onCheckedChange={(checked) => {
                    setSelectedIds(checked ? new Set(leads.map((l) => l.id)) : new Set());
                  }}
                />
              </TableHead>
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
            {manualRow && (
              <TableRow ref={manualRowRef} className="bg-muted/30">
                <TableCell />
                {(["company", "website", "person", "title", "email", "linkedin", "source"] as EditableField[]).map((field) => (
                  <TableCell key={field}>
                    <Input
                      value={manualRow[field]}
                      onChange={(e) => setManualRow((prev) => prev ? { ...prev, [field]: e.target.value } : prev)}
                      placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                      className="h-7 text-sm px-2 py-0 border-border/50"
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveManualRow(); }}
                    />
                  </TableCell>
                ))}
                <TableCell colSpan={6} />
              </TableRow>
            )}
            {leads.length === 0 && !manualRow ? (
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
                      <EditableCell
                        value={l[field]}
                        onSave={(v) => onUpdateLead(l.id, field, v)}
                        renderDisplay={
                          field === "website" || field === "linkedin"
                            ? (val, onEdit) =>
                                val ? (
                                  <a
                                    href={val.startsWith("http") ? val : `https://${val}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline decoration-muted-foreground/40 underline-offset-2 hover:text-foreground transition-colors"
                                    onDoubleClick={(e) => { e.preventDefault(); onEdit(); }}
                                  >
                                    {val}
                                  </a>
                                ) : (
                                  <span onDoubleClick={onEdit}>{"\u00A0"}</span>
                                )
                            : field === "email"
                            ? (val, onEdit) =>
                                val ? (
                                  <span
                                    className="underline decoration-muted-foreground/40 underline-offset-2 cursor-pointer hover:text-foreground transition-colors"
                                    onClick={() => { navigator.clipboard.writeText(val); toast.success("Email copied!", { duration: 2000 }); }}
                                    onDoubleClick={onEdit}
                                  >
                                    {val}
                                  </span>
                                ) : (
                                  <span onDoubleClick={onEdit}>{"\u00A0"}</span>
                                )
                            : undefined
                        }
                      />
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
