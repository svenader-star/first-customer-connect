import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SetupFormState } from "@/components/SetupScreen";

const defaultForm: SetupFormState = {
  geo: "germany",
  icpDescription: "",
  company1: "",
  company2: "",
  company3: "",
  role: "",
};

export function useSpaceSetup(spaceId: string | null) {
  const [form, setForm] = useState<SetupFormState>(defaultForm);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const currentSpaceId = useRef(spaceId);

  useEffect(() => {
    currentSpaceId.current = spaceId;
    if (!spaceId) return;

    (async () => {
      const { data } = await supabase
        .from("space_setup")
        .select("*")
        .eq("space_id", spaceId)
        .maybeSingle();

      if (data) {
        setForm({
          geo: data.geography || "germany",
          icpDescription: data.icp_description || "",
          company1: data.example_company_1 || "",
          company2: data.example_company_2 || "",
          company3: data.example_company_3 || "",
          role: data.role || "",
        });
      } else {
        setForm(defaultForm);
        // Ensure row exists
        await supabase.from("space_setup").insert({ space_id: spaceId });
      }
    })();
  }, [spaceId]);

  const updateForm = useCallback(
    (newForm: SetupFormState) => {
      setForm(newForm);
      // Debounced auto-save
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        if (!currentSpaceId.current) return;
        await supabase
          .from("space_setup")
          .update({
            icp_description: newForm.icpDescription,
            example_company_1: newForm.company1,
            example_company_2: newForm.company2,
            example_company_3: newForm.company3,
            role: newForm.role,
            geography: newForm.geo,
          })
          .eq("space_id", currentSpaceId.current);
      }, 500);
    },
    []
  );

  return { form, updateForm };
}
