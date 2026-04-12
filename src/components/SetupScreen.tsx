import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export interface SetupFormState {
  companyType: string;
  geo: string;
  icpDescription: string;
  company1: string;
  company2: string;
  company3: string;
  role: string;
}

interface SetupScreenProps {
  onFindLeads: (leads: any[]) => void;
  formState: SetupFormState;
  onFormChange: (state: SetupFormState) => void;
}

export function SetupScreen({ onFindLeads, formState, onFormChange }: SetupScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<string[] | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const update = (field: keyof SetupFormState, value: string) => {
    onFormChange({ ...formState, ...{ [field]: value } });
  };

  const handleFindLeads = async () => {
    setLoading(true);
    setError(null);
    setDiagnostics(null);
    setProgress("Starting search...");

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/find-leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
          "apikey": supabaseKey,
        },
        body: JSON.stringify({
          icpDescription: formState.icpDescription,
          exampleCompanies: [formState.company1, formState.company2, formState.company3],
          role: formState.role,
          geography: formState.geo,
          companyType: formState.companyType || "startups",
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Edge function error: ${text}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "progress") {
                setProgress(data.message);
              } else if (data.type === "result") {
                if (data.error) {
                  throw new Error(data.error);
                }
                if (data.diagnostics) {
                  setDiagnostics(data.diagnostics);
                }
                onFindLeads(data.leads);
              }
            } catch (e: any) {
              if (e.message && !e.message.includes("Unexpected")) throw e;
            }
          }
        }
      }
    } catch (err: any) {
      console.error("findLeads error:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-6 space-y-6">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Company Type</Label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "startups", label: "🚀 Startups & Tech" },
            { value: "kmu", label: "🔧 KMU & Handwerk" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update("companyType", opt.value)}
              className={`px-4 py-3 rounded-lg border-2 text-sm font-semibold transition-colors ${
                formState.companyType === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="icp" className="text-sm font-medium">ICP Description</Label>
        <Textarea
          id="icp"
          placeholder="Describe your ideal customer profile — industry, size, pain points…"
          className="min-h-[140px] resize-y"
          value={formState.icpDescription}
          onChange={(e) => update("icpDescription", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Example Companies (add links of exemplary websites)</Label>
        <div className="space-y-2">
          <Input placeholder="e.g. Personio" value={formState.company1} onChange={(e) => update("company1", e.target.value)} />
          <Input placeholder="e.g. Celonis" value={formState.company2} onChange={(e) => update("company2", e.target.value)} />
          <Input placeholder="e.g. DeepL" value={formState.company3} onChange={(e) => update("company3", e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role" className="text-sm font-medium">Role</Label>
        <Input id="role" placeholder="e.g. Head of Sales" value={formState.role} onChange={(e) => update("role", e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Geography</Label>
        <Input value={formState.geo} onChange={(e) => update("geo", e.target.value)} placeholder="e.g. München" />
      </div>

      <Button size="lg" className="w-full mt-4" onClick={handleFindLeads} disabled={loading}>
        {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Finding Leads…</> : "Find Leads"}
      </Button>

      {progress && (
        <div className="flex items-center gap-2 mt-2 p-3 bg-primary/5 border border-primary/20 rounded-md">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <p className="text-sm text-primary font-medium">{progress}</p>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}
      {diagnostics && diagnostics.length > 0 && (
        <div className="mt-2 p-3 bg-muted rounded-md text-xs space-y-1">
          <p className="font-medium text-muted-foreground">Diagnostics:</p>
          {diagnostics.map((d, i) => (
            <p key={i} className="text-muted-foreground">• {d}</p>
          ))}
        </div>
      )}
    </div>
  );
}
