import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SetupScreenProps {
  onFindLeads: () => void;
}

export function SetupScreen({ onFindLeads }: SetupScreenProps) {
  const [geo, setGeo] = useState("germany");

  return (
    <div className="max-w-2xl mx-auto py-10 px-6 space-y-6">
      <div className="space-y-2">
        <Label htmlFor="icp" className="text-sm font-medium">ICP Description</Label>
        <Textarea
          id="icp"
          placeholder="Describe your ideal customer profile — industry, size, pain points…"
          className="min-h-[140px] resize-y"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Example Companies</Label>
        <div className="space-y-2">
          <Input placeholder="e.g. Personio" />
          <Input placeholder="e.g. Celonis" />
          <Input placeholder="e.g. DeepL" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role" className="text-sm font-medium">Role</Label>
        <Input id="role" placeholder="e.g. Head of Sales" />
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

      <Button size="lg" className="w-full mt-4" onClick={onFindLeads}>
        Find Leads
      </Button>
    </div>
  );
}
