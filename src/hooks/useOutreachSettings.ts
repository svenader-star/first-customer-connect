import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OutreachSettings {
  emailTask: string;
  emailGoal: string;
  emailTone: string;
  linkedinTask: string;
  linkedinGoal: string;
  linkedinTone: string;
}

const defaultSettings: OutreachSettings = {
  emailTask: "",
  emailGoal: "",
  emailTone: "",
  linkedinTask: "",
  linkedinGoal: "",
  linkedinTone: "",
};

export function useOutreachSettings(spaceId: string | null) {
  const [settings, setSettings] = useState<OutreachSettings>(defaultSettings);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const currentSpaceId = useRef(spaceId);

  useEffect(() => {
    currentSpaceId.current = spaceId;
    if (!spaceId) return;

    (async () => {
      const { data } = await supabase
        .from("space_setup")
        .select("email_task, email_goal, email_tone, linkedin_task, linkedin_goal, linkedin_tone")
        .eq("space_id", spaceId)
        .maybeSingle();

      if (data) {
        setSettings({
          emailTask: data.email_task || "",
          emailGoal: data.email_goal || "",
          emailTone: data.email_tone || "",
          linkedinTask: data.linkedin_task || "",
          linkedinGoal: data.linkedin_goal || "",
          linkedinTone: data.linkedin_tone || "",
        });
      } else {
        setSettings(defaultSettings);
      }
    })();
  }, [spaceId]);

  const updateSettings = useCallback((newSettings: OutreachSettings) => {
    setSettings(newSettings);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!currentSpaceId.current) return;
      await supabase
        .from("space_setup")
        .update({
          email_task: newSettings.emailTask,
          email_goal: newSettings.emailGoal,
          email_tone: newSettings.emailTone,
          linkedin_task: newSettings.linkedinTask,
          linkedin_goal: newSettings.linkedinGoal,
          linkedin_tone: newSettings.linkedinTone,
        } as any)
        .eq("space_id", currentSpaceId.current);
    }, 500);
  }, []);

  return { settings, updateSettings };
}
