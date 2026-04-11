import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OutreachSettings } from "@/hooks/useOutreachSettings";

interface OutreachScreenProps {
  settings: OutreachSettings;
  onSettingsChange: (s: OutreachSettings) => void;
}

export function OutreachScreen({ settings, onSettingsChange }: OutreachScreenProps) {
  const update = (field: keyof OutreachSettings, value: string) => {
    onSettingsChange({ ...settings, [field]: value });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Outreach Templates</h2>

      <div className="flex flex-col md:flex-row gap-5">
        <div className="flex-1 border border-border rounded-lg p-5 space-y-4">
          <h3 className="text-base font-semibold text-foreground">Email</h3>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Task</Label>
            <Input placeholder="Write a short, high-quality cold email" value={settings.emailTask} onChange={(e) => update("emailTask", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Goal</Label>
            <Input placeholder="Learn about [problem space]" value={settings.emailGoal} onChange={(e) => update("emailGoal", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Tone</Label>
            <Input placeholder="Founder, curious, non-salesy" value={settings.emailTone} onChange={(e) => update("emailTone", e.target.value)} />
          </div>
        </div>

        <div className="flex-1 border border-border rounded-lg p-5 space-y-4">
          <h3 className="text-base font-semibold text-foreground">LinkedIn</h3>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Task</Label>
            <Input placeholder="Write a LinkedIn connection request" value={settings.linkedinTask} onChange={(e) => update("linkedinTask", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Goal</Label>
            <Input placeholder="Start a conversation about [topic]" value={settings.linkedinGoal} onChange={(e) => update("linkedinGoal", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Tone</Label>
            <Input placeholder="Casual, peer-to-peer" value={settings.linkedinTone} onChange={(e) => update("linkedinTone", e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
}
