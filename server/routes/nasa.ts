import {
  ALLOWED_NASA_TAGS,
  explainRequestSchema,
  geminiExplanationSchema,
} from "@shared/schemas/nasa";
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { fail, validate } from "../lib/errors";
import {
  cleanApodExplanation,
  isRawApodItem,
  toApodDateSlug,
} from "../lib/nasa";
import { createAdminClient } from "../lib/supabase";

const NASA_REQUEST_TIMEOUT_MS = 10_000;
const GEMINI_REQUEST_TIMEOUT_MS = 60_000;

export const nasa = new Hono<AppEnv>()
  // GET /api/nasa/apod - fetches newest pictures from NASA
  .get("/apod", async (c) => {
    const rawPage = c.req.query("page") ?? "1";
    const rawPerPage = c.req.query("per_page") ?? "20";
    const page = Number(rawPage);
    const perPage = Number(rawPerPage);

    if (!Number.isInteger(page) || page < 1) {
      return fail(c, 400, "invalid_page", "Page must be a positive integer.");
    }
    if (!Number.isInteger(perPage) || perPage < 1 || perPage > 20) {
      return fail(
        c,
        400,
        "invalid_per_page",
        "per_page must be an integer between 1 and 20.",
      );
    }

    let nasaResponse: Response;
    try {
      nasaResponse = await fetch(
        `https://science.nasa.gov/wp-json/wp/v2/apod-basic?page=${page}&per_page=${perPage}`,
        {
          cache: "no-store",
          signal: AbortSignal.timeout(NASA_REQUEST_TIMEOUT_MS),
        },
      );
    } catch (err) {
      console.error("NASA APOD network error:", err);
      return fail(
        c,
        502,
        "nasa_unavailable",
        "Failed to connect to NASA's server. Please try again later.",
      );
    }

    if (!nasaResponse.ok) {
      const nasaErrText = await nasaResponse.text();
      console.error(
        "NASA APOD response error:",
        nasaResponse.status,
        nasaErrText,
      );
      return fail(
        c,
        502,
        "nasa_error",
        "NASA's picture service is temporarily unavailable. Please try again later.",
      );
    }

    let rawData: unknown;
    try {
      rawData = await nasaResponse.json();
    } catch {
      return fail(
        c,
        502,
        "nasa_invalid_json",
        "NASA returned an unreadable response.",
      );
    }

    if (!Array.isArray(rawData) || !rawData.every(isRawApodItem)) {
      return fail(
        c,
        502,
        "nasa_invalid_response",
        "NASA returned picture data in an unexpected format.",
      );
    }
    const items = rawData;

    if (
      items.length > 1 &&
      new Set(
        items.map((item) =>
          JSON.stringify([item.title, item.explanation, item.url]),
        ),
      ).size === 1
    ) {
      console.error(
        "NASA APOD returned repeated picture content:",
        items.length,
      );
      return fail(
        c,
        502,
        "nasa_repeated_content",
        "NASA returned the same picture and description for every result. Please try again later.",
      );
    }

    const rawTotal = nasaResponse.headers.get("X-WP-Total");
    const total = rawTotal === null ? Number.NaN : Number(rawTotal);
    if (!Number.isInteger(total) || total < 0) {
      console.error("NASA APOD response has an invalid X-WP-Total header.");
      return fail(
        c,
        502,
        "nasa_invalid_response",
        "NASA returned invalid pagination information.",
      );
    }

    // Query database cache for existing Hebrew translations
    const dates = items.map((item) => item.date).filter(Boolean);
    const supabase = createAdminClient(c.env);

    let cachedMap = new Map<
      string,
      { title: string; summary: string; tags: string[] }
    >();

    if (dates.length > 0) {
      const { data: cachedRows, error: dbError } = await supabase
        .from("nasa_pictures")
        .select("date, hebrew_title, hebrew_summary, tags")
        .in("date", dates);

      if (dbError) {
        console.error("Failed to load cached NASA explanations:", dbError);
        return fail(
          c,
          500,
          "database_error",
          "Could not load saved Hebrew explanations.",
        );
      }

      if (cachedRows) {
        cachedMap = new Map(
          cachedRows.map((row) => [
            row.date,
            {
              title: row.hebrew_title,
              summary: row.hebrew_summary,
              tags: row.tags,
            },
          ]),
        );
      }
    }

    const pictures = items.map((item) => ({
      date: item.date,
      title: item.title,
      explanation: cleanApodExplanation(item.explanation),
      url: item.url,
      media_type: "image",
      hdurl: item.hdurl || null,
      hebrew: cachedMap.get(item.date) ?? null,
    }));

    return c.json(
      {
        pictures,
        total,
        page,
        per_page: perPage,
        total_pages: Math.ceil(total / perPage),
      },
      200,
      { "Cache-Control": "no-store" },
    );
  })

  // POST /api/nasa/explain - translates and explains an APOD picture in Hebrew
  .post("/explain", validate("json", explainRequestSchema), async (c) => {
    const { date } = c.req.valid("json");

    if (!c.env.GEMINI_API_KEY) {
      return fail(
        c,
        500,
        "missing_config",
        "Gemini API key is not configured.",
      );
    }

    const supabase = createAdminClient(c.env);

    // Rule: Never pay twice for the same answer - check database cache first
    const { data: cached, error: cacheLookupError } = await supabase
      .from("nasa_pictures")
      .select("*")
      .eq("date", date)
      .maybeSingle();

    if (cacheLookupError) {
      console.error(
        "Failed to check cached NASA explanation:",
        cacheLookupError,
      );
      return fail(
        c,
        500,
        "database_error",
        "Could not check for a saved Hebrew explanation.",
      );
    }

    if (cached) {
      return c.json({
        date: cached.date,
        hebrew_title: cached.hebrew_title,
        hebrew_summary: cached.hebrew_summary,
        tags: cached.tags,
        cached: true,
      });
    }

    // Cache miss: fetch authoritatively from NASA (never trust browser text)
    let nasaRes: Response;
    try {
      nasaRes = await fetch(
        `https://science.nasa.gov/wp-json/wp/v2/apod-basic/${toApodDateSlug(date)}`,
        {
          cache: "no-store",
          signal: AbortSignal.timeout(NASA_REQUEST_TIMEOUT_MS),
        },
      );
    } catch (err) {
      console.error("NASA APOD date fetch error:", err);
      return fail(
        c,
        502,
        "nasa_unavailable",
        "Could not contact NASA to retrieve picture details.",
      );
    }

    if (!nasaRes.ok) {
      console.error("NASA date error:", nasaRes.status, await nasaRes.text());
      if (nasaRes.status === 404) {
        return fail(c, 404, "not_found", "NASA has no picture for this date.");
      }
      return fail(
        c,
        502,
        "nasa_error",
        "NASA returned an error for this date.",
      );
    }

    let apodData: unknown;
    try {
      apodData = await nasaRes.json();
    } catch {
      return fail(
        c,
        502,
        "nasa_invalid_json",
        "Could not parse NASA's response.",
      );
    }

    if (!isRawApodItem(apodData)) {
      return fail(
        c,
        502,
        "nasa_invalid_response",
        "NASA returned picture data in an unexpected format.",
      );
    }

    const englishTitle = apodData.title;
    const englishExplanation = cleanApodExplanation(apodData.explanation);
    const imageUrl = apodData.hdurl ?? "";
    const mediaType = "image";

    // Call Gemini REST API using fetch with structured JSON output
    const prompt = `You are an astronomy educator writing for children.
Read this NASA Astronomy Picture of the Day entry and generate:
1. "hebrewTitle": A clear, engaging Hebrew title.
2. "hebrewSummary": A simple explanation of exactly 2 or 3 complete sentences in Hebrew, easy enough for a 10-year-old child to understand.
3. "tags": An array of 1 to 5 tags chosen strictly from this allowed list: ${ALLOWED_NASA_TAGS.join(", ")}.

Picture Title: ${englishTitle}
Picture Explanation: ${englishExplanation}`;

    const geminiBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            hebrewTitle: {
              type: "STRING",
              description: "A clear, engaging title in Hebrew.",
            },
            hebrewSummary: {
              type: "STRING",
              description:
                "Exactly 2 or 3 simple, complete sentences in Hebrew for a 10-year-old.",
            },
            tags: {
              type: "ARRAY",
              items: {
                type: "STRING",
                enum: [...ALLOWED_NASA_TAGS],
              },
            },
          },
          required: ["hebrewTitle", "hebrewSummary", "tags"],
        },
      },
    };

    let geminiRes: Response | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // Use a supported stable Flash model for structured text output.
        geminiRes = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": c.env.GEMINI_API_KEY,
            },
            body: JSON.stringify(geminiBody),
            signal: AbortSignal.timeout(GEMINI_REQUEST_TIMEOUT_MS),
          },
        );
      } catch (err) {
        console.error(`Gemini network error on attempt ${attempt + 1}:`, err);
        if (attempt === 2) {
          const timedOut =
            err instanceof Error &&
            (err.name === "TimeoutError" || err.name === "AbortError");
          return fail(
            c,
            502,
            timedOut ? "gemini_timeout" : "gemini_unavailable",
            timedOut
              ? "Gemini took too long to respond. Please try again."
              : "Could not connect to Gemini. Please try again.",
          );
        }

        const backoffMs = 1000 * 2 ** attempt + Math.random() * 250;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      const retryable =
        geminiRes.status === 408 ||
        geminiRes.status === 429 ||
        geminiRes.status >= 500;
      if (!retryable || attempt === 2) break;

      const backoffMs = 1000 * 2 ** attempt + Math.random() * 250;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }

    if (!geminiRes) {
      return fail(
        c,
        502,
        "gemini_unavailable",
        "Could not reach Gemini AI service.",
      );
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.status, errText);
      const message =
        geminiRes.status === 503 || geminiRes.status === 429
          ? "Gemini is temporarily busy. Please try again in a moment."
          : `Gemini returned HTTP ${geminiRes.status}. Check the server logs for details.`;
      return fail(c, 502, "gemini_error", message);
    }

    let geminiRaw: {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };
    try {
      geminiRaw = await geminiRes.json();
    } catch {
      return fail(
        c,
        502,
        "gemini_invalid_json",
        "Failed to read Gemini response.",
      );
    }

    const generatedText = geminiRaw?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) {
      return fail(
        c,
        502,
        "gemini_empty_response",
        "Gemini returned an empty response.",
      );
    }

    let parsedOutput: unknown;
    try {
      parsedOutput = JSON.parse(generatedText);
    } catch {
      return fail(
        c,
        502,
        "gemini_malformed_json",
        "Gemini did not return valid JSON.",
      );
    }

    // Always validate LLM output against Zod schema (LLMs do not always follow rules)
    const validation = geminiExplanationSchema.safeParse(parsedOutput);
    if (!validation.success) {
      console.error("Gemini validation failure:", validation.error.format());
      return fail(
        c,
        502,
        "gemini_schema_mismatch",
        "Gemini produced an unexpected answer format.",
      );
    }

    const { hebrewTitle, hebrewSummary, tags } = validation.data;

    // Save in database cache so future requests never pay or wait again
    const { error: insertError } = await supabase.from("nasa_pictures").upsert(
      {
        date,
        english_title: englishTitle,
        english_explanation: englishExplanation,
        media_type: mediaType,
        image_url: imageUrl,
        hebrew_title: hebrewTitle,
        hebrew_summary: hebrewSummary,
        tags,
      },
      { onConflict: "date" },
    );

    if (insertError) {
      console.error("Failed to cache NASA picture in database:", insertError);
      return fail(
        c,
        500,
        "database_error",
        "The explanation was generated but could not be saved.",
      );
    }

    return c.json({
      date,
      hebrew_title: hebrewTitle,
      hebrew_summary: hebrewSummary,
      tags,
      cached: false,
    });
  });
