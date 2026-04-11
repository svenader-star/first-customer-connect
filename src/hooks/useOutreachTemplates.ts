import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OutreachTemplate {
  id: string;
  type: string;
  template_number: number;
  subject_line: string;
  body: string;
}

export function useOutreachTemplates() {
  const [templates, setTemplates] = useState<OutreachTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    supabase
      .from("outreach_templates")
      .select("*")
      .order("template_number", { ascending: true })
      .then(({ data }) => {
        setTemplates(data || []);
        setLoading(false);
      });
  }, []);

  const addTemplate = useCallback(async (type: "email" | "linkedin", templateNumber: number) => {
    const { data } = await supabase
      .from("outreach_templates")
      .insert({ type, template_number: templateNumber, subject_line: "", body: "" })
      .select()
      .single();
    if (data) setTemplates((t) => [...t, data]);
    return data;
  }, []);

  const updateTemplate = useCallback((id: string, field: "subject_line" | "body", value: string) => {
    setTemplates((t) => t.map((tmpl) => (tmpl.id === id ? { ...tmpl, [field]: value } : tmpl)));

    if (debounceRef.current[id]) clearTimeout(debounceRef.current[id]);
    debounceRef.current[id] = setTimeout(async () => {
      await supabase.from("outreach_templates").update({ [field]: value }).eq("id", id);
    }, 500);
  }, []);

  return { templates, loading, addTemplate, updateTemplate };
}
