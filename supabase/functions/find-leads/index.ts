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

async function tavilySearch(query: string, apiKey: string, depth = "advanced", maxResults = 10) {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: depth,
      max_results: maxResults,
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
      `${icpDescription} Firma ${geography} Branchenbuch`,
      `${icpDescription} ${geography} site:firmenwissen.de`,
    ];
  }
  return [
    `${role} ${icpDescription} companies ${geography}`,
    `similar companies to ${exampleCompanies[0]} ${geography}`,
    `${role} contact ${icpDescription} ${geography}`,
    `${icpDescription} startups ${geography} site:crunchbase.com`,
    `companies like ${exampleCompanies[1]} ${exampleCompanies[2]} ${geography}`,
  ];
}

function buildSystemPrompt(companyType: string, exclusionInstruction: string): string {
  const base = companyType === "kmu"
    ? `You are a lead research assistant specializing in German SMBs (KMU), Handwerk, and traditional businesses.`
    : `You are a lead research assistant.`;

  return `${base} Based on the search results provided, extract real companies and return a JSON array of leads. Each lead must have these exact fields: company (string), website (string), person (string — leave empty, will be enriched later), title (string — leave empty, will be enriched later), email (string — leave empty, will be enriched later), linkedin (string — leave empty, will be enriched later), source (string — tavily). Return ONLY a valid JSON array with up to 25 leads, no explanation, no markdown, no code fences.

IMPORTANT: Only return companies that strictly match the ICP description provided. If a search result does not clearly match the ICP, exclude it entirely. It is better to return fewer results than to return irrelevant companies. Do not fill up the list with loosely related companies. Extract up to 25 distinct companies. If fewer than 25 match, return only the ones that genuinely match — do not pad with irrelevant results.

For person, title, email, and linkedin fields: set them all to empty strings. These will be populated in a separate enrichment step. Focus ONLY on identifying matching companies and their websites.${exclusionInstruction}`;
}

function extractEmail(text: string): string | null {
  const match = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
}

// Step 1: Find the person for a given company using the role from Setup
async function enrichPerson(lead: any, role: string, geography: string, apiKey: string) {
  const company = (lead.company || "").trim();
  if (!company) return;

  try {
    const query = `${company} ${role} ${geography}`;
    console.log(`Step 1 — Finding person: ${query}`);
    const data = await tavilySearch(query, apiKey, "basic", 5);
    const results = data.results || [];
    const combined = results.map((r: any) => `${r.title} ${r.content}`).join("\n");

    // Try to extract person name and title using simple heuristics
    // We'll pass to a lightweight Claude call for extraction
    lead._personSearchResults = combined;
  } catch (e) {
    console.warn(`Step 1 failed for ${lead.company}:`, e);
  }
}

// Step 2: Find person's email
async function enrichPersonEmail(lead: any, apiKey: string) {
  const person = (lead.person || "").trim();
  const company = (lead.company || "").trim();
  if (!person || !company) return;

  try {
    const nameParts = person.split(" ");
    const query = `${person} ${company} Email OR Kontakt`;
    console.log(`Step 2 — Finding email for ${person}: ${query}`);
    const data = await tavilySearch(query, apiKey, "basic", 3);
    const results = data.results || [];

    for (const r of results) {
      const email = extractEmail(`${r.title} ${r.content} ${r.url}`);
      if (email) {
        lead.email = email;
        console.log(`Step 2 — Found email for ${person}: ${email}`);
        return;
      }
    }
  } catch (e) {
    console.warn(`Step 2 failed for ${lead.person}:`, e);
  }
}

// Step 3: Find general company contact email
async function enrichCompanyEmail(lead: any, apiKey: string) {
  if (lead.email) return; // already found in step 2

  const website = (lead.website || "").trim().replace(/\/$/, "");
  const company = (lead.company || "").trim();
  if (!company) return;

  try {
    const query = website
      ? `${website} Kontakt OR contact OR Impressum Email`
      : `${company} Kontakt Email`;
    console.log(`Step 3 — Finding company email: ${query}`);
    const data = await tavilySearch(query, apiKey, "basic", 3);
    const results = data.results || [];

    for (const r of results) {
      const email = extractEmail(`${r.title} ${r.content} ${r.url}`);
      if (email) {
        lead.email = email;
        console.log(`Step 3 — Found company email: ${email}`);
        return;
      }
    }
  } catch (e) {
    console.warn(`Step 3 failed for ${lead.company}:`, e);
  }
}

// Find LinkedIn profile
async function enrichLinkedIn(lead: any, apiKey: string) {
  if (lead.linkedin && lead.linkedin.includes("linkedin.com/in")) return;
  const person = (lead.person || "").trim();
  const company = (lead.company || "").trim();
  if (!person) return;

  try {
    const query = `${person} ${company} site:linkedin.com/in`;
    const data = await tavilySearch(query, apiKey, "basic", 3);
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

    // === Phase 1: Find companies ===
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
            content: `Search context: Looking for companies matching "${icpDescription}" in ${geography}. Example companies: ${exampleCompanies.join(", ")}. Company type: ${companyType}.\n\nSearch results:\n${JSON.stringify(combinedResults, null, 2)}`,
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

    console.log(`Extracted ${leads.length} companies, starting 3-step enrichment...`);

    // === Phase 2: Step 1 — Find person for each company ===
    await Promise.all(leads.map((lead: any) => enrichPerson(lead, role, geography, TAVILY_API_KEY)));

    // Use Claude to extract person names from search results
    const leadsWithSearchData = leads.filter((l: any) => l._personSearchResults);
    if (leadsWithSearchData.length > 0) {
      const extractionPrompt = `For each company below, extract the person's name and title from the search results. The role we are looking for is: "${role}". Only use a name if you found it explicitly in the text — NEVER guess or invent a name. Return a JSON array with objects having: company (string), person (string), title (string). If no person found, use empty strings.

${leadsWithSearchData.map((l: any) => `Company: ${l.company}\nSearch results: ${l._personSearchResults?.substring(0, 1500)}`).join("\n\n---\n\n")}`;

      try {
        const extractRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1500,
            system: "You extract person names and titles from search results. Return ONLY a valid JSON array, no markdown, no code fences. Only use names explicitly found in the text. Never guess.",
            messages: [{ role: "user", content: extractionPrompt }],
            temperature: 0.1,
          }),
        });

        if (extractRes.ok) {
          const extractData = await extractRes.json();
          const extractContent = extractData.content?.[0]?.text?.trim();
          if (extractContent) {
            const personData = JSON.parse(extractContent);
            if (Array.isArray(personData)) {
              for (const pd of personData) {
                const lead = leads.find((l: any) => l.company === pd.company);
                if (lead && pd.person) {
                  lead.person = pd.person;
                  lead.title = pd.title || "";
                  console.log(`Step 1 — Found person for ${pd.company}: ${pd.person} (${pd.title})`);
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn("Person extraction failed:", e);
      }
    }

    // Clean up temp data
    for (const lead of leads) {
      delete lead._personSearchResults;
    }

    // === Phase 2: Step 2 — Find person email ===
    await Promise.all(leads.map((lead: any) => enrichPersonEmail(lead, TAVILY_API_KEY)));

    // === Phase 2: Step 3 — Find company email as fallback ===
    await Promise.all(leads.map((lead: any) => enrichCompanyEmail(lead, TAVILY_API_KEY)));

    // === Phase 2: LinkedIn enrichment (for all modes) ===
    await Promise.all(leads.map((lead: any) => enrichLinkedIn(lead, TAVILY_API_KEY)));

    // Final cleanup: ensure email field only contains valid emails
    for (const lead of leads) {
      if (lead.email && !lead.email.includes("@")) {
        lead.email = "";
      }
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
