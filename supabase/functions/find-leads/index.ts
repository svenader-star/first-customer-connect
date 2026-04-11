const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const BodySchema = z.object({
  icpDescription: z.string().min(1),
  exampleCompanies: z.array(z.string()).length(3),
  role: z.string().min(1),
  geography: z.string().min(1),
});

async function tavilySearch(query: string, apiKey: string) {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "advanced",
      max_results: 5,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tavily API error [${res.status}]: ${text}`);
  }
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { icpDescription, exampleCompanies, role, geography } = parsed.data;

    const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");
    if (!TAVILY_API_KEY) throw new Error("TAVILY_API_KEY is not configured");

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    // Step 1: Tavily searches
    const queries = [
      `${role} ${icpDescription} companies ${geography}`,
      `similar companies to ${exampleCompanies[0]} ${geography}`,
      `${role} contact ${icpDescription} ${geography}`,
    ];

    console.log("Running Tavily searches:", queries);

    const searchResults = await Promise.all(
      queries.map((q) => tavilySearch(q, TAVILY_API_KEY))
    );

    const combinedResults = searchResults
      .flatMap((r) => r.results || [])
      .map((r: any) => ({ title: r.title, url: r.url, content: r.content }));

    console.log(`Got ${combinedResults.length} total search results`);

    // Step 2: Anthropic Claude structuring
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 2000,
        system: `You are a lead research assistant. Based on the search results provided, extract real companies and people and return a JSON array of leads. Each lead must have these exact fields: company (string), website (string), person (string — guess a realistic name if not found), title (string), email (string — guess format as firstname@company.com), linkedin (string — full LinkedIn URL if found, otherwise empty string), source (string — tavily). Return ONLY a valid JSON array with 5-8 leads, no explanation, no markdown, no code fences.`,
        messages: [
          {
            role: "user",
            content: `Search context: Looking for ${role} at companies matching "${icpDescription}" in ${geography}. Example companies: ${exampleCompanies.join(", ")}.\n\nSearch results:\n${JSON.stringify(combinedResults, null, 2)}`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!anthropicRes.ok) {
      const text = await anthropicRes.text();
      throw new Error(`Anthropic API error [${anthropicRes.status}]: ${text}`);
    }

    const anthropicData = await anthropicRes.json();
    const content = anthropicData.content?.[0]?.text?.trim();

    if (!content) throw new Error("Empty response from Anthropic");

    const leads = JSON.parse(content);

    if (!Array.isArray(leads)) throw new Error("Anthropic did not return a JSON array");

    console.log(`Extracted ${leads.length} leads`);

    return new Response(JSON.stringify({ success: true, leads }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in find-leads:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
