import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SetupScreen } from "@/components/SetupScreen";
import { LeadsScreen } from "@/components/LeadsScreen";
import { OutreachScreen } from "@/components/OutreachScreen";
import { OutreachTemplatesPanel } from "@/components/OutreachTemplatesPanel";
import { useSpaces } from "@/hooks/useSpaces";
import { useSpaceSetup } from "@/hooks/useSpaceSetup";
import { useLeads } from "@/hooks/useLeads";
import { useOutreachSettings } from "@/hooks/useOutreachSettings";
import { useOutreachTemplates } from "@/hooks/useOutreachTemplates";

type Tab = "setup" | "leads" | "outreach";

const tabs: { key: Tab; label: string }[] = [
  { key: "setup", label: "Setup" },
  { key: "leads", label: "Leads" },
  { key: "outreach", label: "Outreach" },
];

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>("setup");
  const [activeIndex, setActiveIndex] = useState(0);
  const [showTemplates, setShowTemplates] = useState(false);

  const { spaces, loading: spacesLoading, addSpace, renameSpace, deleteSpace } = useSpaces();
  const activeSpace = spaces[activeIndex] || null;
  const activeSpaceId = activeSpace?.id || null;

  const { form: setupForm, updateForm: setSetupForm } = useSpaceSetup(activeSpaceId);
  const { leads, saveExternalLeads, addEmptyLead, updateLead } = useLeads(activeSpaceId);
  const { settings: outreachSettings, updateSettings: setOutreachSettings } = useOutreachSettings(activeSpaceId);
  const { templates } = useOutreachTemplates();

  const handleFoundLeads = (rawLeads: any[]) => {
    saveExternalLeads(rawLeads);
    setActiveTab("leads");
  };

  const handleActiveSpaceChange = (index: number) => {
    setActiveIndex(index);
  };

  if (spacesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="text-muted-foreground text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        spaces={spaces}
        activeIndex={activeIndex}
        onActiveSpaceChange={handleActiveSpaceChange}
        onAddSpace={addSpace}
        onRenameSpace={renameSpace}
        onDeleteSpace={deleteSpace}
        onTemplatesClick={() => setShowTemplates(true)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-border bg-background flex items-center px-5 py-3">
          <span className="text-sm font-semibold text-foreground mr-auto">
            {showTemplates ? "Outreach Templates" : activeSpace?.name || ""}
          </span>

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

          <div className="mr-auto" />
        </div>

        <div className="flex-1 overflow-auto">
          {showTemplates ? (
            <OutreachTemplatesPanel onClose={() => setShowTemplates(false)} />
          ) : (
            <>
              {activeTab === "setup" && (
                <SetupScreen onFindLeads={handleFoundLeads} formState={setupForm} onFormChange={setSetupForm} />
              )}
              {activeTab === "leads" && (
                <LeadsScreen
                  leads={leads}
                  onUpdateLead={updateLead}
                  onAddLead={addEmptyLead}
                  outreachSettings={outreachSettings}
                  templates={templates}
                />
              )}
              {activeTab === "outreach" && (
                <OutreachScreen settings={outreachSettings} onSettingsChange={setOutreachSettings} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
