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

interface SetupScreenProps {
  onFindLeads: (leads: any[]) => void;
}

export function SetupScreen({ onFindLeads }: SetupScreenProps) {
  const [geo, setGeo] = useState("germany");
  const [icpDescription, setIcpDescription] = useState("");
  const [company1, setCompany1] = useState("");
  const [company2, setCompany2] = useState("");
  const [company3, setCompany3] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFindLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("find-leads", {
        body: {
          icpDescription,
          exampleCompanies: [company1, company2, company3],
          role,
          geography: geo,
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
        <Label htmlFor="icp" className="text-sm font-medium">ICP Description</Label>
        <Textarea
          id="icp"
          placeholder="Describe your ideal customer profile — industry, size, pain points…"
          className="min-h-[140px] resize-y"
          value={icpDescription}
          onChange={(e) => setIcpDescription(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Example Companies (add links of exemplary websites)</Label>
        <div className="space-y-2">
          <Input placeholder="e.g. Personio" value={company1} onChange={(e) => setCompany1(e.target.value)} />
          <Input placeholder="e.g. Celonis" value={company2} onChange={(e) => setCompany2(e.target.value)} />
          <Input placeholder="e.g. DeepL" value={company3} onChange={(e) => setCompany3(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role" className="text-sm font-medium">Role</Label>
        <Input id="role" placeholder="e.g. Head of Sales" value={role} onChange={(e) => setRole(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Geography</Label>
        <Select value={geo} onValueChange={setGeo}>
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
