import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function TemplateSection({ title }: { title: string }) {
  return (
    <div className="flex-1 border border-border rounded-lg p-5 space-y-4">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Task</Label>
        <Input placeholder="Write a short, high-quality cold email" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Goal</Label>
        <Input placeholder="Learn about [problem space]" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Tone</Label>
        <Input placeholder="Founder, curious, non-salesy" />
      </div>
    </div>
  );
}

export function OutreachScreen() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Outreach Templates</h2>

      <div className="flex flex-col md:flex-row gap-5">
        <TemplateSection title="Email" />
        <TemplateSection title="LinkedIn" />
      </div>

      <Button size="lg">Save Templates</Button>
    </div>
  );
}
