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

interface Lead {
  id: number;
  company: string;
  website: string;
  person: string;
  title: string;
  email: string;
  linkedin: string;
  source: string;
  emailSubject: string;
  emailBody: string;
  linkedinDraft: string;
  followupSubject: string;
  followupBody: string;
  emailSent: boolean;
  linkedinSent: boolean;
  followupSent: boolean;
}

const mockLeads: Lead[] = [
  {
    id: 1, company: "Personio", website: "personio.de", person: "Anna Müller", title: "VP Sales",
    email: "anna@personio.de", linkedin: "linkedin.com/in/annamueller", source: "Apollo",
    emailSubject: "Quick question about Personio's outbound strategy",
    emailBody: "Hi Anna,\n\nI noticed Personio is scaling its sales org rapidly. We help B2B teams book 3x more qualified meetings without adding headcount.\n\nWould love to learn how you're thinking about outbound — open to a quick chat this week?\n\nBest,\n[Your Name]",
    linkedinDraft: "Hi Anna — congrats on Personio's growth! I work with sales leaders at scaling SaaS companies and would love to exchange ideas on outbound. Open to connecting?",
    followupSubject: "Following up — Personio outbound",
    followupBody: "Hi Anna,\n\nJust wanted to circle back on my previous note. I know things move fast at Personio — happy to keep this brief.\n\nWould a 15-min call next week work?\n\nBest,\n[Your Name]",
    emailSent: false, linkedinSent: false, followupSent: false,
  },
  {
    id: 2, company: "Celonis", website: "celonis.com", person: "Markus Weber", title: "Head of Revenue",
    email: "markus.weber@celonis.com", linkedin: "linkedin.com/in/markusweber", source: "LinkedIn Sales Nav",
    emailSubject: "Outreach automation for Celonis",
    emailBody: "Hi Markus,\n\nCelonis's process mining approach is impressive. We help revenue teams like yours reduce time-to-close by automating outreach workflows.\n\nCurious if this is on your radar — happy to share how similar companies approach it.\n\nBest,\n[Your Name]",
    linkedinDraft: "Hi Markus — big fan of what Celonis is doing in process intelligence. I help revenue leaders streamline outbound ops. Would love to connect and share ideas.",
    followupSubject: "Following up — outreach automation",
    followupBody: "Hi Markus,\n\nFollowing up on my earlier message. I recently helped a Series C company cut their outbound time by 40% — thought it might resonate.\n\nOpen to a brief call?\n\nBest,\n[Your Name]",
    emailSent: true, linkedinSent: false, followupSent: false,
  },
  {
    id: 3, company: "DeepL", website: "deepl.com", person: "Sophie Klein", title: "Director of Growth",
    email: "sophie.klein@deepl.com", linkedin: "linkedin.com/in/sophieklein", source: "Crunchbase",
    emailSubject: "Growth outreach ideas for DeepL",
    emailBody: "Hi Sophie,\n\nDeepL's growth trajectory is remarkable. I work with growth leaders at language/AI companies to systematize founder-led outreach.\n\nWould love to learn what channels are working for you — open to a quick exchange?\n\nBest,\n[Your Name]",
    linkedinDraft: "Hi Sophie — DeepL is one of the most exciting AI companies in Europe. I help growth teams at similar companies scale outbound. Would love to connect!",
    followupSubject: "Quick follow-up — DeepL growth",
    followupBody: "Hi Sophie,\n\nQuick follow-up to my last note. No pressure at all — just thought sharing what we see working for AI companies might be valuable.\n\nHappy to send over a quick summary instead if that's easier.\n\nBest,\n[Your Name]",
    emailSent: false, linkedinSent: true, followupSent: false,
  },
  {
    id: 4, company: "Forto", website: "forto.com", person: "Jan Becker", title: "CRO",
    email: "jan.becker@forto.com", linkedin: "linkedin.com/in/janbecker", source: "Apollo",
    emailSubject: "Outbound engine for Forto",
    emailBody: "Hi Jan,\n\nForto is transforming freight forwarding — love the digital-first approach. We help CROs at logistics-tech companies build repeatable outbound engines.\n\nWould you be open to a 15-min call to see if there's a fit?\n\nBest,\n[Your Name]",
    linkedinDraft: "Hi Jan — impressive what Forto is building in digital logistics. I work with CROs at B2B companies scaling outbound. Would love to exchange notes.",
    followupSubject: "Bumping this — Forto outbound",
    followupBody: "Hi Jan,\n\nJust bumping this up. I know logistics moves fast — happy to work around your schedule.\n\nEven a quick async exchange would be great.\n\nBest,\n[Your Name]",
    emailSent: false, linkedinSent: false, followupSent: false,
  },
  {
    id: 5, company: "Sennder", website: "sennder.com", person: "Lisa Hoffmann", title: "VP Business Development",
    email: "lisa.hoffmann@sennder.com", linkedin: "linkedin.com/in/lisahoffmann", source: "LinkedIn Sales Nav",
    emailSubject: "Enterprise outreach for Sennder",
    emailBody: "Hi Lisa,\n\nSennder's mission to digitize road logistics is exciting. We help BD leaders at fast-moving companies systematize outreach to enterprise accounts.\n\nWould love to hear how you're approaching this — open to a quick chat?\n\nBest,\n[Your Name]",
    linkedinDraft: "Hi Lisa — love what Sennder is doing for road freight. I work with BD teams at logistics companies to scale outreach. Would love to connect!",
    followupSubject: "Following up — Sennder BD",
    followupBody: "Hi Lisa,\n\nFollowing up briefly. I recently spoke with a BD leader at a similar logistics company — happy to share some takeaways.\n\nLet me know if you're open to a quick call.\n\nBest,\n[Your Name]",
    emailSent: true, linkedinSent: true, followupSent: false,
  },
];

type EditableField = "company" | "website" | "person" | "title" | "email" | "linkedin" | "source";

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

type ModalType = "email" | "linkedin" | "followup";

interface ModalState {
  leadId: number;
  type: ModalType;
  person: string;
}

interface LeadsScreenProps {
  externalLeads?: any[] | null;
}

export function LeadsScreen({ externalLeads }: LeadsScreenProps) {
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [hasLoadedExternal, setHasLoadedExternal] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);

  // When external leads arrive, replace mock data
  useEffect(() => {
    if (externalLeads && externalLeads.length > 0 && !hasLoadedExternal) {
      const mapped: Lead[] = externalLeads.map((l: any, i: number) => ({
        id: i + 1,
        company: l.company || "",
        website: l.website || "",
        person: l.person || "",
        title: l.title || "",
        email: l.email || "",
        linkedin: l.linkedin || "",
        source: l.source || "tavily",
        emailSubject: "",
        emailBody: "",
        linkedinDraft: "",
        followupSubject: "",
        followupBody: "",
        emailSent: false,
        linkedinSent: false,
        followupSent: false,
      }));
      setLeads(mapped);
      setHasLoadedExternal(true);
    }
  }, [externalLeads, hasLoadedExternal]);

  const toggle = (id: number, field: "emailSent" | "linkedinSent" | "followupSent") => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: !l[field] } : l)));
  };

  const updateField = (id: number, field: string, value: string) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const currentLead = modal ? leads.find((l) => l.id === modal.leadId) : null;

  const modalTitle = modal
    ? modal.type === "email" ? `Email Draft — ${modal.person}`
    : modal.type === "linkedin" ? `LinkedIn Draft — ${modal.person}`
    : `Follow-up Draft — ${modal.person}`
    : "";

  return (
    <div className="p-6 min-w-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Leads</h2>
        <Button size="sm">+ Add Leads</Button>
      </div>

      <div className="border border-border rounded-lg overflow-x-auto">
        <Table className="min-w-[1400px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#ID</TableHead>
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
            {leads.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-muted-foreground">{l.id}</TableCell>
                {(["company", "website", "person", "title", "email", "linkedin", "source"] as EditableField[]).map((field) => (
                  <TableCell key={field} className={field === "company" ? "font-medium" : field === "email" || field === "linkedin" ? "text-muted-foreground text-xs" : field === "website" || field === "title" ? "text-muted-foreground" : ""}>
                    <EditableCell value={l[field]} onSave={(v) => updateField(l.id, field, v)} />
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
                  <Checkbox checked={l.emailSent} onCheckedChange={() => toggle(l.id, "emailSent")} />
                </TableCell>
                <TableCell className="text-center">
                  <Checkbox checked={l.linkedinSent} onCheckedChange={() => toggle(l.id, "linkedinSent")} />
                </TableCell>
                <TableCell className="text-center">
                  <Checkbox checked={l.followupSent} onCheckedChange={() => toggle(l.id, "followupSent")} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!modal} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-lg bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{modalTitle}</DialogTitle>
          </DialogHeader>

          {currentLead && modal?.type === "email" && (
            <div className="space-y-4 mt-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-sm font-medium">Subject Line</Label>
                  <CopyButton getText={() => currentLead.emailSubject} />
                </div>
                <Input
                  value={currentLead.emailSubject}
                  onChange={(e) => updateField(currentLead.id, "emailSubject", e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-sm font-medium">Email Body</Label>
                  <CopyButton getText={() => currentLead.emailBody} />
                </div>
                <Textarea
                  value={currentLead.emailBody}
                  onChange={(e) => updateField(currentLead.id, "emailBody", e.target.value)}
                  className="min-h-[200px]"
                />
              </div>
            </div>
          )}

          {currentLead && modal?.type === "linkedin" && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <Label className="text-sm font-medium">LinkedIn Message</Label>
                <CopyButton getText={() => currentLead.linkedinDraft} />
              </div>
              <Textarea
                value={currentLead.linkedinDraft}
                onChange={(e) => updateField(currentLead.id, "linkedinDraft", e.target.value)}
                className="min-h-[150px]"
              />
            </div>
          )}

          {currentLead && modal?.type === "followup" && (
            <div className="space-y-4 mt-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-sm font-medium">Subject Line</Label>
                  <CopyButton getText={() => currentLead.followupSubject} />
                </div>
                <Input
                  value={currentLead.followupSubject}
                  onChange={(e) => updateField(currentLead.id, "followupSubject", e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-sm font-medium">Follow-up Body</Label>
                  <CopyButton getText={() => currentLead.followupBody} />
                </div>
                <Textarea
                  value={currentLead.followupBody}
                  onChange={(e) => updateField(currentLead.id, "followupBody", e.target.value)}
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
