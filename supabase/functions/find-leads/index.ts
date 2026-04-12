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
    body: JSON.stringify({ api_key: apiKey, query, search_depth: depth, max_results: maxResults }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tavily API error [${res.status}]: ${text}`);
  }
  return await res.json();
}

function buildDiscoveryQueries(companyType: string, icpDescription: string, exampleCompanies: string[], role: string, geography: string): string[] {
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
    if (/linkedin\.com|crunchbase\.com|wlw\.de|gelbeseiten\.de|kompass\.com|firmenwissen\.de|northdata\.de|facebook\.com|twitter\.com|instagram\.com/i.test(url)) continue;
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.hostname}`;
    } catch { continue; }
  }
  return "";
}

// === Google Places API functions ===
async function googlePlacesTextSearch(query: string, apiKey: string): Promise<{ results: any[]; error?: string }> {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
  console.log(`  [Google Places] Request: ${query}`);
  const res = await fetch(url);
  const rawText = await res.text();
  if (!res.ok) {
    return { results: [], error: `Google Places HTTP ${res.status}` };
  }
  try {
    const data = JSON.parse(rawText);
    if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return { results: [], error: `Google Places API status: ${data.status} — ${data.error_message || "no details"}` };
    }
    console.log(`  [Google Places] status: ${data.status}, results: ${(data.results || []).length}`);
    return { results: data.results || [] };
  } catch (e) {
    return { results: [], error: `Google Places response not valid JSON` };
  }
}

async function googlePlaceDetails(placeId: string, apiKey: string): Promise<any> {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,website,formatted_phone_number&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.result || null;
}

async function extractBusinessType(icpDescription: string, anthropicKey: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: 100,
      system: `Extract the core German business type keyword(s) from the ICP description. Return ONLY the keyword(s), e.g. "Sanitärbetrieb", "Elektriker", "Schreinerei". No explanation, no quotes, just the word(s).`,
      messages: [{ role: "user", content: icpDescription }],
      temperature: 0.1,
    }),
  });
  if (!res.ok) throw new Error("Failed to extract business type");
  const data = await res.json();
  return data.content?.[0]?.text?.trim() || icpDescription;
}

async function discoverCompaniesGooglePlaces(
  icpDescription: string, geography: string, excludeCompanies: string[],
  anthropicKey: string, placesApiKey: string,
): Promise<{ companies: { company: string; website: string; source: string }[]; errors: string[] }> {
  const errors: string[] = [];
  let businessType: string;
  try {
    businessType = await extractBusinessType(icpDescription, anthropicKey);
    console.log(`Google Places — Extracted business type: "${businessType}"`);
  } catch (e) {
    return { companies: [], errors: [`Business type extraction failed: ${e}`] };
  }

  const queries = [
    `${businessType} ${geography}`,
    `${businessType} Betrieb ${geography}`,
    `${businessType} Unternehmen ${geography}`,
  ];

  const allPlaces: any[] = [];
  for (const q of queries) {
    const { results, error } = await googlePlacesTextSearch(q, placesApiKey);
    if (error) errors.push(error);
    allPlaces.push(...results);
  }

  const seenNames = new Set<string>();
  const excludeSet = new Set(excludeCompanies.map(c => c.toLowerCase().trim()));
  const uniquePlaces: any[] = [];
  for (const place of allPlaces) {
    const name = (place.name || "").trim();
    const key = name.toLowerCase();
    if (!name || seenNames.has(key) || excludeSet.has(key)) continue;
    seenNames.add(key);
    uniquePlaces.push(place);
  }

  const companies: { company: string; website: string; source: string }[] = [];
  for (const place of uniquePlaces.slice(0, 25)) {
    let website = "";
    if (place.website) {
      website = place.website;
    } else if (place.place_id) {
      const details = await googlePlaceDetails(place.place_id, placesApiKey);
      if (details?.website) website = details.website;
    }
    if (website) {
      try { const parsed = new URL(website); website = `${parsed.protocol}//${parsed.hostname}`; } catch {}
    }
    companies.push({ company: place.name, website, source: "google_places" });
  }
  return { companies, errors };
}

// Enrichment helpers
async function enrichWebsite(lead: any, geography: string, apiKey: string) {
  try {
    const query = `${lead.company} ${geography} official website`;
    const data = await tavilySearch(query, apiKey, "basic", 5);
    const website = extractUrl(data.results || [], lead.company);
    if (website) lead.website = website;
  } catch (e) { console.warn(`  2a failed for ${lead.company}:`, e); }
}

async function enrichPerson(lead: any, role: string, geography: string, apiKey: string, anthropicKey: string) {
  try {
    const query = `${lead.company} ${role} ${geography}`;
    const data = await tavilySearch(query, apiKey, "basic", 5);
    const combined = (data.results || []).map((r: any) => `${r.title} ${r.content}`).join("\n");
    if (!combined.trim()) return;
    const extractRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", max_tokens: 300,
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
        if (parsed.person) { lead.person = parsed.person; lead.title = parsed.title || ""; }
      }
    }
  } catch (e) { console.warn(`  2b failed for ${lead.company}:`, e); }
}

async function enrichEmail(lead: any, apiKey: string) {
  const person = (lead.person || "").trim();
  const company = (lead.company || "").trim();
  const website = (lead.website || "").trim().replace(/\/$/, "");
  if (person) {
    try {
      const data = await tavilySearch(`${person} ${company} email`, apiKey, "basic", 3);
      for (const r of (data.results || [])) {
        const email = extractEmail(`${r.title} ${r.content} ${r.url}`);
        if (email) { lead.email = email; return; }
      }
    } catch {}
  }
  try {
    const query = website ? `${website} Kontakt OR contact OR Impressum Email` : `${company} Kontakt Email`;
    const data = await tavilySearch(query, apiKey, "basic", 3);
    for (const r of (data.results || [])) {
      const email = extractEmail(`${r.title} ${r.content} ${r.url}`);
      if (email) { lead.email = email; return; }
    }
  } catch {}
}

async function enrichLinkedIn(lead: any, apiKey: string) {
  const person = (lead.person || "").trim();
  if (!person) return;
  try {
    const data = await tavilySearch(`${person} ${lead.company} site:linkedin.com/in`, apiKey, "basic", 3);
    const match = (data.results || []).find((r: any) => r.url?.includes("linkedin.com/in/"));
    if (match) lead.linkedin = match.url;
  } catch {}
}

// Enrich a single lead (all steps)
async function enrichLead(lead: any, role: string, geography: string, tavilyKey: string, anthropicKey: string) {
  if (!lead.website) await enrichWebsite(lead, geography, tavilyKey);
  await enrichPerson(lead, role, geography, tavilyKey, anthropicKey);
  await enrichEmail(lead, tavilyKey);
  await enrichLinkedIn(lead, tavilyKey);
}

// Pick top N best ICP matches using Claude
async function pickTopMatches(companies: any[], icpDescription: string, geography: string, n: number, anthropicKey: string): Promise<string[]> {
  const names = companies.map(c => c.company);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: 1000,
      system: `From the list of company names, pick the top ${n} that best match this ICP: "${icpDescription}" in geography "${geography}". Return ONLY a JSON array of company name strings, no explanation.`,
      messages: [{ role: "user", content: JSON.stringify(names) }],
      temperature: 0.1,
    }),
  });
  if (!res.ok) return names.slice(0, n);
  const data = await res.json();
  const text = data.content?.[0]?.text?.trim();
  try {
    const picked = JSON.parse(text);
    if (Array.isArray(picked)) return picked.slice(0, n);
  } catch {}
  return names.slice(0, n);
}

// SSE helper
function sseEvent(data: any): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { icpDescription, exampleCompanies, role, geography, excludeCompanies, companyType } = parsed.data;
    const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");
    if (!TAVILY_API_KEY) throw new Error("TAVILY_API_KEY is not configured");
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    // Use SSE streaming for progress
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: any) => {
          try { controller.enqueue(encoder.encode(sseEvent(data))); } catch {}
        };

        try {
          let leads: any[];
          const diagnostics: string[] = [];

          send({ type: "progress", message: "Searching for companies..." });

          if (companyType === "kmu") {
            // === KMU MODE ===
            const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
            let companies: { company: string; website: string; source: string }[] = [];

            if (GOOGLE_PLACES_API_KEY) {
              try {
                const placesResult = await discoverCompaniesGooglePlaces(
                  icpDescription, geography, excludeCompanies, ANTHROPIC_API_KEY, GOOGLE_PLACES_API_KEY
                );
                companies = placesResult.companies;
                if (placesResult.errors.length > 0) diagnostics.push(...placesResult.errors.map(e => `[Google Places] ${e}`));
              } catch (e) {
                diagnostics.push(`Google Places failed: ${e instanceof Error ? e.message : e}`);
              }
            } else {
              diagnostics.push("GOOGLE_PLACES_API_KEY not configured — skipping Google Places");
            }

            // Tavily fallback
            if (companies.length === 0) {
              send({ type: "progress", message: "Google Places returned no results, trying Tavily fallback..." });
              diagnostics.push("Falling back to Tavily for KMU company discovery");
              const kmuQueries = [
                `${icpDescription} ${geography} site:wlw.de`,
                `${icpDescription} Betrieb ${geography} site:gelbeseiten.de`,
                `${icpDescription} Unternehmen ${geography} site:kompass.com`,
                `${icpDescription} ${geography} Handwerk OR Betrieb OR Inhaber`,
                `${icpDescription} Firma ${geography} Branchenbuch`,
                `${icpDescription} ${geography} site:firmenwissen.de`,
              ];
              const searchResults = await Promise.all(kmuQueries.map(q =>
                tavilySearch(q, TAVILY_API_KEY).catch(e => {
                  diagnostics.push(`Tavily query failed: ${e}`);
                  return { results: [] };
                })
              ));
              const allResults = searchResults.flatMap(r => r.results || []).map((r: any) => ({
                title: r.title, url: r.url, content: r.content,
              }));
              const seen = new Set<string>();
              const dedupedResults = allResults.filter((r: any) => {
                try { const d = new URL(r.url).hostname.replace("www.", ""); if (seen.has(d)) return false; seen.add(d); return true; } catch { return true; }
              });

              const exclusionInstruction = excludeCompanies.length > 0
                ? `\n\nDo NOT return any of these companies: ${excludeCompanies.join(", ")}.` : "";

              const companyExtractionRes = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
                body: JSON.stringify({
                  model: "claude-sonnet-4-20250514", max_tokens: 2000,
                  system: `Extract company names from search results that strictly match this ICP: "${icpDescription}". Return ONLY a JSON array of unique company name strings (up to 25). No explanation, no markdown.${exclusionInstruction}`,
                  messages: [{ role: "user", content: `Company type: kmu. Geography: ${geography}.\n\nSearch results:\n${JSON.stringify(dedupedResults, null, 2)}` }],
                  temperature: 0.2,
                }),
              });

              if (companyExtractionRes.ok) {
                const companyData = await companyExtractionRes.json();
                const companyListText = companyData.content?.[0]?.text?.trim();
                if (companyListText) {
                  try {
                    const companyNames: string[] = JSON.parse(companyListText);
                    if (Array.isArray(companyNames)) {
                      const seenNames = new Set<string>();
                      companies = companyNames.filter(name => {
                        const key = name.toLowerCase().trim();
                        if (seenNames.has(key)) return false; seenNames.add(key); return true;
                      }).map(name => ({ company: name, website: "", source: "tavily" }));
                    }
                  } catch (e) { diagnostics.push(`Claude parse error: ${e}`); }
                }
              } else {
                const text = await companyExtractionRes.text();
                diagnostics.push(`Claude extraction failed: HTTP ${companyExtractionRes.status}`);
              }
            }

            send({ type: "progress", message: `Found ${companies.length} companies, selecting top matches...` });

            // Pick top 10
            if (companies.length > 10) {
              const topNames = await pickTopMatches(companies, icpDescription, geography, 10, ANTHROPIC_API_KEY);
              const topSet = new Set(topNames.map(n => n.toLowerCase().trim()));
              companies = companies.filter(c => topSet.has(c.company.toLowerCase().trim()));
              if (companies.length === 0) companies = companies.slice(0, 10); // safety
              diagnostics.push(`Selected top ${companies.length} from ${topNames.length} candidates`);
            }

            leads = companies.map(c => ({
              company: c.company, website: c.website, person: "", title: "", email: "", linkedin: "", source: c.source,
            }));

            send({ type: "progress", message: `Enriching ${leads.length} companies with contact details...` });

            // Parallel enrichment in batches of 3
            for (let i = 0; i < leads.length; i += 3) {
              const batch = leads.slice(i, i + 3);
              send({ type: "progress", message: `Finding contact details (${Math.min(i + 3, leads.length)}/${leads.length})...` });
              await Promise.all(batch.map(lead => enrichLead(lead, role, geography, TAVILY_API_KEY, ANTHROPIC_API_KEY)));
            }

          } else {
            // === STARTUP MODE ===
            const queries = buildDiscoveryQueries(companyType, icpDescription, exampleCompanies, role, geography);
            const searchResults = await Promise.all(queries.map(q => tavilySearch(q, TAVILY_API_KEY)));
            const allResults = searchResults.flatMap(r => r.results || []).map((r: any) => ({
              title: r.title, url: r.url, content: r.content,
            }));
            const seen = new Set<string>();
            const dedupedResults = allResults.filter((r: any) => {
              try { const d = new URL(r.url).hostname.replace("www.", ""); if (seen.has(d)) return false; seen.add(d); return true; } catch { return true; }
            });

            const exclusionInstruction = excludeCompanies.length > 0
              ? `\n\nDo NOT return any of these companies: ${excludeCompanies.join(", ")}.` : "";

            send({ type: "progress", message: `Found ${dedupedResults.length} results, extracting companies...` });

            const companyExtractionRes = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514", max_tokens: 2000,
                system: `Extract company names from search results that strictly match this ICP: "${icpDescription}". Return ONLY a JSON array of unique company name strings (up to 25). No explanation, no markdown. Only include companies that clearly match the ICP.${exclusionInstruction}`,
                messages: [{ role: "user", content: `Company type: ${companyType}. Geography: ${geography}.\n\nSearch results:\n${JSON.stringify(dedupedResults, null, 2)}` }],
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
            if (!Array.isArray(companyNames)) throw new Error("Claude did not return a JSON array");

            const seenNames = new Set<string>();
            let uniqueCompanies = companyNames.filter(name => {
              const key = name.toLowerCase().trim();
              if (seenNames.has(key)) return false; seenNames.add(key); return true;
            });

            send({ type: "progress", message: `Found ${uniqueCompanies.length} companies, selecting top matches...` });

            // Pick top 10
            if (uniqueCompanies.length > 10) {
              uniqueCompanies = await pickTopMatches(
                uniqueCompanies.map(n => ({ company: n })), icpDescription, geography, 10, ANTHROPIC_API_KEY
              );
              diagnostics.push(`Selected top ${uniqueCompanies.length} from candidates`);
            }

            leads = uniqueCompanies.map(name => ({
              company: name, website: "", person: "", title: "", email: "", linkedin: "", source: "tavily",
            }));

            send({ type: "progress", message: `Enriching ${leads.length} companies with contact details...` });

            // Parallel enrichment in batches of 3
            for (let i = 0; i < leads.length; i += 3) {
              const batch = leads.slice(i, i + 3);
              send({ type: "progress", message: `Finding contact details (${Math.min(i + 3, leads.length)}/${leads.length})...` });
              await Promise.all(batch.map(lead => enrichLead(lead, role, geography, TAVILY_API_KEY, ANTHROPIC_API_KEY)));
            }
          }

          send({ type: "progress", message: "Cleaning up results..." });

          // Final cleanup with Claude
          const cleanupRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514", max_tokens: 4000,
              system: `You clean and format lead data. Return a JSON array with these exact fields per lead: company (string), website (string), person (string), title (string), email (string), linkedin (string), source (string). Rules: 1) Remove any lead where company is empty. 2) Email must contain @ or be empty — never phone numbers. 3) LinkedIn must contain linkedin.com/in or be empty. 4) Never invent data — if a field is empty, keep it empty. 5) Remove obvious duplicates. Return ONLY valid JSON array, no markdown.`,
              messages: [{ role: "user", content: JSON.stringify(leads) }],
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
              } catch {}
            }
          }

          for (const lead of finalLeads) {
            if (lead.email && !lead.email.includes("@")) lead.email = "";
            if (lead.linkedin && !lead.linkedin.includes("linkedin.com/in")) lead.linkedin = "";
          }

          send({ type: "result", success: true, leads: finalLeads, diagnostics: diagnostics.length > 0 ? diagnostics : undefined });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          send({ type: "result", error: message });
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in find-leads:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
