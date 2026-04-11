import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SetupScreen } from "@/components/SetupScreen";
import { LeadsScreen } from "@/components/LeadsScreen";
import { OutreachScreen } from "@/components/OutreachScreen";
import { OutreachTemplatesPanel } from "@/components/OutreachTemplatesPanel";

type Tab = "setup" | "leads" | "outreach";

const tabs: { key: Tab; label: string }[] = [
  { key: "setup", label: "Setup" },
  { key: "leads", label: "Leads" },
  { key: "outreach", label: "Outreach" },
];

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>("setup");
  const [activeSpaceName, setActiveSpaceName] = useState("Space 1");
  const [showTemplates, setShowTemplates] = useState(false);

  const navigateToLeads = () => setActiveTab("leads");

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar onTemplatesClick={() => setShowTemplates(true)} onActiveSpaceChange={setActiveSpaceName} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header bar */}
        <div className="border-b border-border bg-background flex items-center px-5 py-3">
          {/* Space name top-left */}
          <span className="text-sm font-semibold text-foreground mr-auto">
            {showTemplates ? "Outreach Templates" : activeSpaceName}
          </span>

          {/* Pill tab switcher — centered (hidden when templates panel is open) */}
          {!showTemplates && (
            <div className="flex items-center bg-muted rounded-full p-0.5">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    activeTab === t.key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Spacer to keep pills centered */}
          <div className="mr-auto" />
        </div>

        {/* Screen content */}
        <div className="flex-1 overflow-auto">
          {showTemplates ? (
            <OutreachTemplatesPanel onClose={() => setShowTemplates(false)} />
          ) : (
            <>
              {activeTab === "setup" && <SetupScreen onFindLeads={navigateToLeads} />}
              {activeTab === "leads" && <LeadsScreen />}
              {activeTab === "outreach" && <OutreachScreen />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
