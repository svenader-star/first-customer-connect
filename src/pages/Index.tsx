import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SetupScreen } from "@/components/SetupScreen";
import { LeadsScreen } from "@/components/LeadsScreen";
import { OutreachScreen } from "@/components/OutreachScreen";

type Tab = "setup" | "leads" | "outreach";

const tabs: { key: Tab; label: string }[] = [
  { key: "setup", label: "Setup" },
  { key: "leads", label: "Leads" },
  { key: "outreach", label: "Outreach" },
];

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>("setup");

  const navigateToLeads = () => setActiveTab("leads");
  const navigateToOutreach = () => setActiveTab("outreach");

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar onTemplatesClick={navigateToOutreach} />

      <div className="flex-1 flex flex-col">
        {/* Tab bar */}
        <div className="border-b border-border bg-background">
          <nav className="flex">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Screen content */}
        <div className="flex-1 overflow-auto">
          {activeTab === "setup" && <SetupScreen onFindLeads={navigateToLeads} />}
          {activeTab === "leads" && <LeadsScreen />}
          {activeTab === "outreach" && <OutreachScreen />}
        </div>
      </div>
    </div>
  );
}
