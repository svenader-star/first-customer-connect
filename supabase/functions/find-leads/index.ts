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
  excludeCompanies: z.array(z.string()).optional().default([]),
  companyType: z.enum(["startups", "kmu"]).optional().default("startups"),
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

function buildQueries(companyType: string, icpDescription: string, exampleCompanies: string[], role: string, geography: string): string[] {
  if (companyType === "kmu") {
    return [
      `${icpDescription} ${geography} site:wlw.de`,
      `${icpDescription} Betrieb ${geography} site:gelbeseiten.de`,
      `${icpDescription} Unternehmen ${geography} site:kompass.com`,
      `${icpDescription} ${geography} Handwerk OR Betrieb OR Inhaber`,
    ];
  }
  // startups (existing logic)
  return [
    `${role} ${icpDescription} companies ${geography}`,
    `similar companies to ${exampleCompanies[0]} ${geography}`,
    `${role} contact ${icpDescription} ${geography}`,
  ];
}

function buildSystemPrompt(companyType: string, exclusionInstruction: string): string {
  if (companyType === "kmu") {
    return `You are a lead research assistant specializing in German SMBs (KMU), Handwerk, and traditional businesses. Based on the search results provided, extract real companies and return a JSON array of leads. Each lead must have these exact fields: company (string), website (string), person (string — the owner, Inhaber, or Geschäftsführer if found), title (string), email (string), linkedin (string — leave empty for KMU), source (string — tavily). Return ONLY a valid JSON array with 5-8 leads, no explanation, no markdown, no code fences.

IMPORTANT: Only return companies that strictly match the ICP description provided. If a search result does not clearly match the ICP, exclude it entirely. It is better to return fewer results than to return irrelevant companies. Do not fill up the list with loosely related companies.

For the person field: only use a name if you found it explicitly in the search results (e.g. Inhaber, Geschäftsführer, owner). If no person name was found, return an empty string for person, title, and email. Do NOT invent or guess a person's name.

For the email field: only use an email if you found it explicitly in the search results. If not found, return an empty string.

Focus on extracting: company name, website, phone number (put in email field if no email found), address, and the owner or Geschäftsführer name.${exclusionInstruction}`;
  }

  // startups (existing prompt)
  return `You are a lead research assistant. Based on the search results provided, extract real companies and people and return a JSON array of leads. Each lead must have these exact fields: company (string), website (string), person (string), title (string), email (string), linkedin (string — full LinkedIn URL if found, otherwise empty string), source (string — tavily). Return ONLY a valid JSON array with 5-8 leads, no explanation, no markdown, no code fences.

IMPORTANT: Only return companies that strictly match the ICP description provided. If a search result does not clearly match the ICP, exclude it entirely. It is better to return fewer results than to return irrelevant companies. Do not fill up the list with loosely related companies.

For the person field: only use a name if you found it explicitly in the search results for that specific company. If no person name was found, return an empty string for person, title, linkedin, and email. Do NOT invent or guess a person's name.

For the email field: only construct an email if you have a real person name from the search results. If person is empty, email must also be empty.${exclusionInstruction}`;
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

    const { icpDescription, exampleCompanies, role, geography, excludeCompanies, companyType } = parsed.data;

    const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");
    if (!TAVILY_API_KEY) throw new Error("TAVILY_API_KEY is not configured");

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const queries = buildQueries(companyType, icpDescription, exampleCompanies, role, geography);

    console.log(`Company type: ${companyType}, Running Tavily searches:`, queries);

    const searchResults = await Promise.all(
      queries.map((q) => tavilySearch(q, TAVILY_API_KEY))
    );

    const combinedResults = searchResults
      .flatMap((r) => r.results || [])
      .map((r: any) => ({ title: r.title, url: r.url, content: r.content }));

    console.log(`Got ${combinedResults.length} total search results`);

    const exclusionInstruction = excludeCompanies.length > 0
      ? `\n\nIMPORTANT: Do NOT return any of the following companies that have already been found: ${excludeCompanies.join(", ")}. Only return new companies that are not in this list.`
      : "";

    const systemPrompt = buildSystemPrompt(companyType, exclusionInstruction);

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Search context: Looking for ${role} at companies matching "${icpDescription}" in ${geography}. Example companies: ${exampleCompanies.join(", ")}. Company type: ${companyType}.\n\nSearch results:\n${JSON.stringify(combinedResults, null, 2)}`,
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

    console.log(`Extracted ${leads.length} leads, now searching for LinkedIn profiles...`);

    // Second round: search LinkedIn for each person (skip for KMU)
    if (companyType !== "kmu") {
      const linkedinSearches = leads.map(async (lead: any) => {
        if (lead.linkedin && lead.linkedin.includes("linkedin.com/in")) return lead;
        const person = (lead.person || "").trim();
        const company = (lead.company || "").trim();
        if (!person) return lead;

        try {
          const query = `${person} ${company} site:linkedin.com/in`;
          const res = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: TAVILY_API_KEY,
              query,
              search_depth: "basic",
              max_results: 3,
            }),
          });
          if (!res.ok) {
            console.warn(`LinkedIn search failed for ${person}: ${res.status}`);
            return lead;
          }
          const data = await res.json();
          const linkedinResult = (data.results || []).find((r: any) =>
            r.url && r.url.includes("linkedin.com/in/")
          );
          if (linkedinResult) {
            lead.linkedin = linkedinResult.url;
            console.log(`Found LinkedIn for ${person}: ${linkedinResult.url}`);
          }
        } catch (e) {
          console.warn(`LinkedIn search error for ${person}:`, e);
        }
        return lead;
      });

      await Promise.all(linkedinSearches);
    }

    console.log(`Returning ${leads.length} leads`);

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
