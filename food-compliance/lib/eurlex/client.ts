/**
 * EUR-Lex API Client
 *
 * Handles all interactions with the EUR-Lex public API.
 * All functions return safely — never throw.
 */

export interface EurLexDocument {
  celexNumber: string;
  title:       string;
  url:         string;
  date:        string | null;
}

// EUR-Lex search base URL — uses the SPARQL/REST-style endpoint
const SEARCH_BASE =
  "https://eur-lex.europa.eu/search.html";

// Document HTML endpoint
const DOC_BASE =
  "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:";

/**
 * searchRecentRegulations
 *
 * Searches EUR-Lex for recent EU food regulations matching the query.
 * Returns an array of { celexNumber, title, url, date }.
 * Returns [] on any error.
 */
export async function searchRecentRegulations(
  query: string,
): Promise<EurLexDocument[]> {
  try {
    const params = new URLSearchParams({
      type:         "quick",
      lang:         "en",
      text:         query,
      scope:        "EURLEX",
      or0:          "DTT:Regulation",
      sortOne:      "DD",
      sortOneOrder: "desc",
      format:       "json",
    });

    const url = `${SEARCH_BASE}?${params.toString()}`;

    const res = await fetch(url, {
      headers: { Accept: "application/json, text/html" },
      // 10-second timeout via AbortController
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(`[eurlex] search HTTP ${res.status} for query: ${query}`);
      return [];
    }

    const contentType = res.headers.get("content-type") ?? "";

    // EUR-Lex sometimes returns JSON, sometimes HTML. Handle both.
    if (contentType.includes("json")) {
      return parseJsonResponse(await res.json(), query);
    }

    // Fall back: parse HTML result page
    const html = await res.text();
    return parseHtmlResponse(html);
  } catch (err) {
    console.error(`[eurlex] search error for "${query}":`, err);
    return [];
  }
}

/**
 * fetchDocumentText
 *
 * Fetches the full EUR-Lex HTML document for a CELEX number,
 * strips HTML tags, and truncates to 8000 characters for AI processing.
 * Returns "" on any error.
 */
export async function fetchDocumentText(celexNumber: string): Promise<string> {
  try {
    const url = `${DOC_BASE}${encodeURIComponent(celexNumber)}`;

    const res = await fetch(url, {
      headers: { Accept: "text/html" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      console.error(`[eurlex] doc fetch HTTP ${res.status} for ${celexNumber}`);
      return "";
    }

    const html = await res.text();
    return stripHtml(html).slice(0, 8_000);
  } catch (err) {
    console.error(`[eurlex] doc fetch error for ${celexNumber}:`, err);
    return "";
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a JSON response from EUR-Lex search.
 * The EUR-Lex JSON format varies; we attempt multiple known shapes.
 */
function parseJsonResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: any,
  _query: string,
): EurLexDocument[] {
  try {
    // Shape 1: { results: { result: [...] } }
    const results: unknown[] =
      json?.results?.result ??
      json?.searchResults?.result ??
      json?.result ??
      [];

    if (!Array.isArray(results) || results.length === 0) return [];

    return results
      .map((r: unknown) => {
        const row = r as Record<string, unknown>;
        const celex = extractString(row, ["celexNumber", "celex", "CELEX_NUMBER"]);
        const title = extractString(row, ["title", "TITLE", "longTitle"]);
        const date  = extractString(row, ["date", "DD", "dateDocument"]);

        if (!celex) return null;

        return {
          celexNumber: celex,
          title:       title ?? celex,
          url:         `${DOC_BASE}${encodeURIComponent(celex)}`,
          date:        date ?? null,
        };
      })
      .filter((x): x is EurLexDocument => x !== null)
      .slice(0, 20);
  } catch {
    return [];
  }
}

/**
 * Parse the HTML search results page from EUR-Lex.
 * Looks for CELEX numbers embedded in result links.
 */
function parseHtmlResponse(html: string): EurLexDocument[] {
  const docs: EurLexDocument[] = [];
  const seen = new Set<string>();

  // Match CELEX numbers in href attributes, e.g. uri=CELEX:32011R1169
  const celexRe = /uri=CELEX[:%]([0-9A-Z]+)/gi;
  let m: RegExpExecArray | null;

  while ((m = celexRe.exec(html)) !== null && docs.length < 20) {
    const celex = decodeURIComponent(m[1]);
    if (seen.has(celex)) continue;
    seen.add(celex);

    docs.push({
      celexNumber: celex,
      title:       celex,       // title not reliably extractable from HTML here
      url:         `${DOC_BASE}${encodeURIComponent(celex)}`,
      date:        null,
    });
  }

  return docs;
}

/** Strip all HTML tags and collapse whitespace. */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Extract a string value from an object trying multiple possible keys. */
function extractString(
  obj: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "object" && v !== null) {
      const inner = (v as Record<string, unknown>)["value"];
      if (typeof inner === "string" && inner.trim()) return inner.trim();
    }
  }
  return null;
}
