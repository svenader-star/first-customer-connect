import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

interface Lead {
  id: number;
  company: string;
  website: string;
  person: string;
  title: string;
  email: string;
  linkedin: string;
  source: string;
  emailDraft: string;
  linkedinDraft: string;
  followupDraft: string;
  emailSent: boolean;
  linkedinSent: boolean;
  followupSent: boolean;
}

const mockLeads: Lead[] = [
  {
    id: 1, company: "Personio", website: "personio.de", person: "Anna Müller", title: "VP Sales",
    email: "anna@personio.de", linkedin: "linkedin.com/in/annamueller", source: "Apollo",
    emailDraft: "Hi Anna,\n\nI noticed Personio is scaling its sales org rapidly. We help B2B teams book 3x more qualified meetings without adding headcount.\n\nWould love to learn how you're thinking about outbound — open to a quick chat this week?\n\nBest,\n[Your Name]",
    linkedinDraft: "Hi Anna — congrats on Personio's growth! I work with sales leaders at scaling SaaS companies and would love to exchange ideas on outbound. Open to connecting?",
    followupDraft: "Hi Anna,\n\nJust wanted to circle back on my previous note. I know things move fast at Personio — happy to keep this brief.\n\nWould a 15-min call next week work?\n\nBest,\n[Your Name]",
    emailSent: false, linkedinSent: false, followupSent: false,
  },
  {
    id: 2, company: "Celonis", website: "celonis.com", person: "Markus Weber", title: "Head of Revenue",
    email: "markus.weber@celonis.com", linkedin: "linkedin.com/in/markusweber", source: "LinkedIn Sales Nav",
    emailDraft: "Hi Markus,\n\nCelonis's process mining approach is impressive. We help revenue teams like yours reduce time-to-close by automating outreach workflows.\n\nCurious if this is on your radar — happy to share how similar companies approach it.\n\nBest,\n[Your Name]",
    linkedinDraft: "Hi Markus — big fan of what Celonis is doing in process intelligence. I help revenue leaders streamline outbound ops. Would love to connect and share ideas.",
    followupDraft: "Hi Markus,\n\nFollowing up on my earlier message. I recently helped a Series C company cut their outbound time by 40% — thought it might resonate.\n\nOpen to a brief call?\n\nBest,\n[Your Name]",
    emailSent: true, linkedinSent: false, followupSent: false,
  },
  {
    id: 3, company: "DeepL", website: "deepl.com", person: "Sophie Klein", title: "Director of Growth",
    email: "sophie.klein@deepl.com", linkedin: "linkedin.com/in/sophieklein", source: "Crunchbase",
    emailDraft: "Hi Sophie,\n\nDeepL's growth trajectory is remarkable. I work with growth leaders at language/AI companies to systematize founder-led outreach.\n\nWould love to learn what channels are working for you — open to a quick exchange?\n\nBest,\n[Your Name]",
    linkedinDraft: "Hi Sophie — DeepL is one of the most exciting AI companies in Europe. I help growth teams at similar companies scale outbound. Would love to connect!",
    followupDraft: "Hi Sophie,\n\nQuick follow-up to my last note. No pressure at all — just thought sharing what we see working for AI companies might be valuable.\n\nHappy to send over a quick summary instead if that's easier.\n\nBest,\n[Your Name]",
    emailSent: false, linkedinSent: true, followupSent: false,
  },
  {
    id: 4, company: "Forto", website: "forto.com", person: "Jan Becker", title: "CRO",
    email: "jan.becker@forto.com", linkedin: "linkedin.com/in/janbecker", source: "Apollo",
    emailDraft: "Hi Jan,\n\nForto is transforming freight forwarding — love the digital-first approach. We help CROs at logistics-tech companies build repeatable outbound engines.\n\nWould you be open to a 15-min call to see if there's a fit?\n\nBest,\n[Your Name]",
    linkedinDraft: "Hi Jan — impressive what Forto is building in digital logistics. I work with CROs at B2B companies scaling outbound. Would love to exchange notes.",
    followupDraft: "Hi Jan,\n\nJust bumping this up. I know logistics moves fast — happy to work around your schedule.\n\nEven a quick async exchange would be great.\n\nBest,\n[Your Name]",
    emailSent: false, linkedinSent: false, followupSent: false,
  },
  {
    id: 5, company: "Sennder", website: "sennder.com", person: "Lisa Hoffmann", title: "VP Business Development",
    email: "lisa.hoffmann@sennder.com", linkedin: "linkedin.com/in/lisahoffmann", source: "LinkedIn Sales Nav",
    emailDraft: "Hi Lisa,\n\nSennder's mission to digitize road logistics is exciting. We help BD leaders at fast-moving companies systematize outreach to enterprise accounts.\n\nWould love to hear how you're approaching this — open to a quick chat?\n\nBest,\n[Your Name]",
    linkedinDraft: "Hi Lisa — love what Sennder is doing for road freight. I work with BD teams at logistics companies to scale outreach. Would love to connect!",
    followupDraft: "Hi Lisa,\n\nFollowing up briefly. I recently spoke with a BD leader at a similar logistics company — happy to share some takeaways.\n\nLet me know if you're open to a quick call.\n\nBest,\n[Your Name]",
    emailSent: true, linkedinSent: true, followupSent: false,
  },
];

export function LeadsScreen() {
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [modal, setModal] = useState<{ title: string; content: string } | null>(null);

  const toggle = (id: number, field: "emailSent" | "linkedinSent" | "followupSent") => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: !l[field] } : l))
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Leads</h2>
        <Button size="sm">+ Add Leads</Button>
      </div>

      <div className="border border-border rounded-lg overflow-x-auto">
        <Table>
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
                <TableCell className="font-medium">{l.company}</TableCell>
                <TableCell className="text-muted-foreground">{l.website}</TableCell>
                <TableCell>{l.person}</TableCell>
                <TableCell className="text-muted-foreground">{l.title}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{l.email}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{l.linkedin}</TableCell>
                <TableCell>{l.source}</TableCell>
                <TableCell className="text-center">
                  <Button variant="outline" size="sm" onClick={() => setModal({ title: `Email Draft — ${l.person}`, content: l.emailDraft })}>View</Button>
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="outline" size="sm" onClick={() => setModal({ title: `LinkedIn Draft — ${l.person}`, content: l.linkedinDraft })}>View</Button>
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="outline" size="sm" onClick={() => setModal({ title: `Follow-up Draft — ${l.person}`, content: l.followupDraft })}>View</Button>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{modal?.title}</DialogTitle>
          </DialogHeader>
          <pre className="whitespace-pre-wrap text-sm text-foreground leading-relaxed mt-2">{modal?.content}</pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
