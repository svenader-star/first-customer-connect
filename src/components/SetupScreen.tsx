import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

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

  const update = (field: keyof SetupFormState, value: string) => {
    onFormChange({ ...formState, ...{ [field]: value } });
  };

  const handleFindLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("find-leads", {
        body: {
          icpDescription: formState.icpDescription,
          exampleCompanies: [formState.company1, formState.company2, formState.company3],
          role: formState.role,
          geography: formState.geo,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      onFindLeads(data.leads);
    } catch (err: any) {
      console.error("findLeads error:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
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
        <Select value={formState.geo} onValueChange={(v) => update("geo", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="germany">Germany</SelectItem>
            <SelectItem value="austria">Austria</SelectItem>
            <SelectItem value="switzerland">Switzerland</SelectItem>
            <SelectItem value="usa">USA</SelectItem>
            <SelectItem value="uk">UK</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button size="lg" className="w-full mt-4" onClick={handleFindLeads} disabled={loading}>
        {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Finding Leads…</> : "Find Leads"}
      </Button>

      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}
    </div>
  );
}
