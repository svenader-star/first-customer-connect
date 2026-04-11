import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DbLead {
  id: string;
  space_id: string;
  company: string;
  website: string;
  person: string;
  title: string;
  email: string;
  linkedin: string;
  source: string;
  email_sent: boolean;
  linkedin_sent: boolean;
  followup_sent: boolean;
}

export function useLeads(spaceId: string | null) {
  const [leads, setLeads] = useState<DbLead[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!spaceId) { setLeads([]); return; }
    setLoading(true);
    supabase
      .from("leads")
      .select("*")
      .eq("space_id", spaceId)
      .then(({ data }) => {
        setLeads(data || []);
        setLoading(false);
      });
  }, [spaceId]);

  const saveExternalLeads = useCallback(
    async (externalLeads: any[]) => {
      if (!spaceId) return;
      // Delete existing leads for this space
      await supabase.from("leads").delete().eq("space_id", spaceId);

      const rows = externalLeads.map((l: any) => ({
        space_id: spaceId,
        company: l.company || "",
        website: l.website || "",
        person: l.person || "",
        title: l.title || "",
        email: l.email || "",
        linkedin: l.linkedin || "",
        source: l.source || "tavily",
      }));

      const { data } = await supabase.from("leads").insert(rows).select();
      if (data) setLeads(data);
    },
    [spaceId]
  );

  const updateLead = useCallback(
    async (id: string, field: keyof DbLead, value: string | boolean) => {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
      await supabase.from("leads").update({ [field]: value } as any).eq("id", id);
    },
    []
  );

  return { leads, loading, saveExternalLeads, updateLead };
}
