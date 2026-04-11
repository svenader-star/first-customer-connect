import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lead, draftType, outreachSettings, templates } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const systemPrompt = `You are an expert at writing short, personalized outreach messages for founders doing early-stage customer discovery. Use the provided Task, Goal, and Tone as your brief. Use the provided example templates as style and format references. Write a personalized message for the specific lead. Return ONLY a valid JSON object — no markdown, no explanation, no code fences. For email and followup return: subjectLine (string) and body (string). For linkedin return: message (string, max 300 characters for connection requests).`;

    const templateExamples = (templates || [])
      .map((t: any) => {
        const label = `${t.type} template #${t.template_number}`;
        const parts = [];
        if (t.subject_line) parts.push(`Subject: ${t.subject_line}`);
        if (t.body) parts.push(`Body: ${t.body}`);
        return parts.length ? `[${label}]\n${parts.join("\n")}` : null;
      })
      .filter(Boolean)
      .join("\n\n");

    const userPrompt = `Draft type: ${draftType}

Lead info:
- Person: ${lead.person || "Unknown"}
- Company: ${lead.company || "Unknown"}
- Title: ${lead.title || "Unknown"}
- Website: ${lead.website || "Unknown"}

Outreach settings:
- Task: ${outreachSettings?.task || "Write a short outreach message"}
- Goal: ${outreachSettings?.goal || "Learn about their needs"}
- Tone: ${outreachSettings?.tone || "Founder, curious, non-salesy"}

${templateExamples ? `Example templates for reference:\n${templateExamples}` : "No example templates provided."}

${draftType === "followup" ? "This is a follow-up message. Reference that a previous email was sent and gently follow up." : ""}

Return ONLY a valid JSON object.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || "{}";

    // Parse the JSON from Claude's response
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Try to extract JSON from the response
      const match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("draft-message error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
