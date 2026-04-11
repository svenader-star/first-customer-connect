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

function buildDiscoveryQueries(companyType: string, icpDescription: string, exampleCompanies: string[], role: string, geography: string): string[] {
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

function extractEmail(text: string): string | null {
  const match = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
}

function extractUrl(results: any[], companyName: string): string {
  for (const r of results) {
    const url = r.url || "";
    // Skip directory/listing sites
    if (/linkedin\.com|crunchbase\.com|wlw\.de|gelbeseiten\.de|kompass\.com|firmenwissen\.de|northdata\.de|facebook\.com|twitter\.com|instagram\.com/i.test(url)) continue;
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.hostname}`;
    } catch { continue; }
  }
  return "";
}

// Step 2a: Find company website
async function enrichWebsite(lead: any, geography: string, apiKey: string) {
  try {
    const query = `${lead.company} ${geography} official website`;
    console.log(`  2a — Website search: ${query}`);
    const data = await tavilySearch(query, apiKey, "basic", 5);
    const website = extractUrl(data.results || [], lead.company);
    if (website) {
      lead.website = website;
      console.log(`  2a — Found website: ${website}`);
    }
  } catch (e) {
    console.warn(`  2a failed for ${lead.company}:`, e);
  }
}

// Step 2b: Find person
async function enrichPerson(lead: any, role: string, geography: string, apiKey: string, anthropicKey: string) {
  try {
    const query = `${lead.company} ${role} ${geography}`;
    console.log(`  2b — Person search: ${query}`);
    const data = await tavilySearch(query, apiKey, "basic", 5);
    const combined = (data.results || []).map((r: any) => `${r.title} ${r.content}`).join("\n");
    if (!combined.trim()) return;

    // Use Claude to extract person name/title
    const extractRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        system: `Extract exactly one person's name and job title from the search results for company "${lead.company}". The role we seek is: "${role}". Return JSON: {"person":"...","title":"..."}. Only use names explicitly found in the text. If no person found, return empty strings. No markdown, no code fences.`,
        messages: [{ role: "user", content: combined.substring(0, 2000) }],
        temperature: 0.1,
      }),
    });

    if (extractRes.ok) {
      const extractData = await extractRes.json();
      const text = extractData.content?.[0]?.text?.trim();
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed.person) {
          lead.person = parsed.person;
          lead.title = parsed.title || "";
          console.log(`  2b — Found person: ${parsed.person} (${parsed.title})`);
        }
      }
    }
  } catch (e) {
    console.warn(`  2b failed for ${lead.company}:`, e);
  }
}

// Step 2c: Find email
async function enrichEmail(lead: any, apiKey: string) {
  const person = (lead.person || "").trim();
  const company = (lead.company || "").trim();
  const website = (lead.website || "").trim().replace(/\/$/, "");

  // Try personal email first if person found
  if (person) {
    try {
      const query = `${person} ${company} email`;
      console.log(`  2c — Personal email search: ${query}`);
      const data = await tavilySearch(query, apiKey, "basic", 3);
      for (const r of (data.results || [])) {
        const email = extractEmail(`${r.title} ${r.content} ${r.url}`);
        if (email) {
          lead.email = email;
          console.log(`  2c — Found personal email: ${email}`);
          return;
        }
      }
    } catch (e) {
      console.warn(`  2c personal email failed:`, e);
    }
  }

  // Fallback: company contact email
  try {
    const query = website
      ? `${website} Kontakt OR contact OR Impressum Email`
      : `${company} Kontakt Email`;
    console.log(`  2c — Company email search: ${query}`);
    const data = await tavilySearch(query, apiKey, "basic", 3);
    for (const r of (data.results || [])) {
      const email = extractEmail(`${r.title} ${r.content} ${r.url}`);
      if (email) {
        lead.email = email;
        console.log(`  2c — Found company email: ${email}`);
        return;
      }
    }
  } catch (e) {
    console.warn(`  2c company email failed:`, e);
  }
}

// Step 2d: Find LinkedIn
async function enrichLinkedIn(lead: any, apiKey: string) {
  const person = (lead.person || "").trim();
  if (!person) return;

  try {
    const query = `${person} ${lead.company} site:linkedin.com/in`;
    console.log(`  2d — LinkedIn search: ${query}`);
    const data = await tavilySearch(query, apiKey, "basic", 3);
    const match = (data.results || []).find((r: any) => r.url?.includes("linkedin.com/in/"));
    if (match) {
      lead.linkedin = match.url;
      console.log(`  2d — Found LinkedIn: ${match.url}`);
    }
  } catch (e) {
    console.warn(`  2d LinkedIn failed:`, e);
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

    // === STEP 1: Discover company names ===
    const queries = buildDiscoveryQueries(companyType, icpDescription, exampleCompanies, role, geography);
    console.log(`Step 1 — Running ${queries.length} discovery searches (${companyType} mode)`);

    const searchResults = await Promise.all(queries.map(q => tavilySearch(q, TAVILY_API_KEY)));
    const allResults = searchResults.flatMap(r => r.results || []).map((r: any) => ({
      title: r.title, url: r.url, content: r.content,
    }));

    // Deduplicate by domain
    const seen = new Set<string>();
    const dedupedResults = allResults.filter((r: any) => {
      try {
        const domain = new URL(r.url).hostname.replace("www.", "");
        if (seen.has(domain)) return false;
        seen.add(domain);
        return true;
      } catch { return true; }
    });

    console.log(`Step 1 — ${allResults.length} results, ${dedupedResults.length} after dedup`);

    const exclusionInstruction = excludeCompanies.length > 0
      ? `\n\nDo NOT return any of these companies: ${excludeCompanies.join(", ")}.`
      : "";

    // Extract company names using Claude
    const companyExtractionRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: `Extract company names from search results that strictly match this ICP: "${icpDescription}". Return ONLY a JSON array of unique company name strings (up to 25). No explanation, no markdown. Only include companies that clearly match the ICP — it is better to return fewer than to include irrelevant ones.${exclusionInstruction}`,
        messages: [{
          role: "user",
          content: `Company type: ${companyType}. Geography: ${geography}.\n\nSearch results:\n${JSON.stringify(dedupedResults, null, 2)}`,
        }],
        temperature: 0.2,
      }),
    });

    if (!companyExtractionRes.ok) {
      const text = await companyExtractionRes.text();
      throw new Error(`Anthropic error [${companyExtractionRes.status}]: ${text}`);
    }

    const companyData = await companyExtractionRes.json();
    const companyListText = companyData.content?.[0]?.text?.trim();
    if (!companyListText) throw new Error("Empty company list from Claude");

    const companyNames: string[] = JSON.parse(companyListText);
    if (!Array.isArray(companyNames)) throw new Error("Claude did not return a JSON array of company names");

    // Deduplicate company names (case-insensitive)
    const seenNames = new Set<string>();
    const uniqueCompanies = companyNames.filter(name => {
      const key = name.toLowerCase().trim();
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });

    console.log(`Step 1 — ${uniqueCompanies.length} unique companies to enrich`);

    // === STEP 2: Enrich each company iteratively ===
    const leads = uniqueCompanies.map(name => ({
      company: name,
      website: "",
      person: "",
      title: "",
      email: "",
      linkedin: "",
      source: "tavily",
    }));

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      console.log(`\nEnriching ${i + 1}/${leads.length}: ${lead.company}`);

      // 2a: Website
      await enrichWebsite(lead, geography, TAVILY_API_KEY);

      // 2b: Person
      await enrichPerson(lead, role, geography, TAVILY_API_KEY, ANTHROPIC_API_KEY);

      // 2c: Email
      await enrichEmail(lead, TAVILY_API_KEY);

      // 2d: LinkedIn (only if person found)
      await enrichLinkedIn(lead, TAVILY_API_KEY);
    }

    // === STEP 3: Final cleanup with Claude ===
    const cleanupRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: `You clean and format lead data. Return a JSON array with these exact fields per lead: company (string), website (string), person (string), title (string), email (string), linkedin (string), source (string — always "tavily"). Rules: 1) Remove any lead where company is empty. 2) Email must contain @ or be empty — never phone numbers. 3) LinkedIn must contain linkedin.com/in or be empty. 4) Never invent data — if a field is empty, keep it empty. 5) Remove obvious duplicates. Return ONLY valid JSON array, no markdown.`,
        messages: [{
          role: "user",
          content: JSON.stringify(leads),
        }],
        temperature: 0.1,
      }),
    });

    let finalLeads = leads;
    if (cleanupRes.ok) {
      const cleanupData = await cleanupRes.json();
      const cleanupText = cleanupData.content?.[0]?.text?.trim();
      if (cleanupText) {
        try {
          const cleaned = JSON.parse(cleanupText);
          if (Array.isArray(cleaned)) finalLeads = cleaned;
        } catch { /* use original leads */ }
      }
    }

    // Final validation
    for (const lead of finalLeads) {
      if (lead.email && !lead.email.includes("@")) lead.email = "";
      if (lead.linkedin && !lead.linkedin.includes("linkedin.com/in")) lead.linkedin = "";
    }

    console.log(`\nReturning ${finalLeads.length} leads`);

    return new Response(JSON.stringify({ success: true, leads: finalLeads }), {
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
