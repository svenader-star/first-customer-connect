import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Space {
  id: string;
  name: string;
  created_at: string;
}

export function useSpaces() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadSpaces();
  }, []);

  const loadSpaces = async () => {
    const { data, error } = await supabase
      .from("spaces")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading spaces:", error);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      setSpaces(data);
    } else {
      // Create default space
      const { data: newSpace, error: createError } = await supabase
        .from("spaces")
        .insert({ name: "Space 1" })
        .select()
        .single();

      if (!createError && newSpace) {
        setSpaces([newSpace]);
        // Also create default setup row
        await supabase.from("space_setup").insert({ space_id: newSpace.id });
      }
    }
    setLoading(false);
  };

  const addSpace = useCallback(async () => {
    const name = `Space ${spaces.length + 1}`;
    const { data, error } = await supabase
      .from("spaces")
      .insert({ name })
      .select()
      .single();

    if (!error && data) {
      setSpaces((s) => [...s, data]);
      // Create setup row
      await supabase.from("space_setup").insert({ space_id: data.id });
      return data;
    }
    return null;
  }, [spaces.length]);

  const renameSpace = useCallback(async (id: string, newName: string) => {
    const { error } = await supabase
      .from("spaces")
      .update({ name: newName })
      .eq("id", id);

    if (!error) {
      setSpaces((s) => s.map((sp) => (sp.id === id ? { ...sp, name: newName } : sp)));
    }
  }, []);

  const deleteSpace = useCallback(async (id: string) => {
    const { error } = await supabase.from("spaces").delete().eq("id", id);
    if (!error) {
      setSpaces((s) => s.filter((sp) => sp.id !== id));
    }
  }, []);

  return { spaces, loading, addSpace, renameSpace, deleteSpace };
}
