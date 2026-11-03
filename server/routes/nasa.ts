import {
  ALLOWED_NASA_TAGS,
  explainRequestSchema,
  geminiExplanationSchema,
} from "@shared/schemas/nasa";
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { fail, validate } from "../lib/errors";
import { createAdminClient } from "../lib/supabase";

export const nasa = new Hono<AppEnv>()
  // GET /api/nasa/apod - fetches random pictures from NASA APOD
  .get("/apod", async (c) => {
    const rawCount = c.req.query("count");
    const count = Math.min(
      Math.max(parseInt(rawCount ?? "10", 10) || 10, 1),
      20,
    );

    if (!c.env.NASA_API_KEY) {
      return fail(
        c,
        500,
        "missing_config",
        "NASA API key is not configured on the server.",
      );
    }

    let nasaResponse: Response;
    try {
      nasaResponse = await fetch(
        `https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(c.env.NASA_API_KEY)}&count=${count}`,
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
      console.error(
        "NASA APOD response error:",
        nasaResponse.status,
        await nasaResponse.text(),
      );
      return fail(
        c,
        502,
        "nasa_error",
        "NASA's service returned an error. Please try again later.",
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

    type RawApodItem = {
      date: string;
      title: string;
      explanation: string;
      url: string;
      media_type?: string;
      hdurl?: string;
    };

    const items: RawApodItem[] = Array.isArray(rawData)
      ? rawData
      : [rawData as RawApodItem];

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

      if (!dbError && cachedRows) {
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

    const result = items.map((item) => ({
      date: item.date,
      title: item.title,
      explanation: item.explanation,
      url: item.url,
      media_type: item.media_type || "image",
      hdurl: item.hdurl || null,
      hebrew: cachedMap.get(item.date) ?? null,
    }));

    return c.json(result);
  })

  // POST /api/nasa/explain - translates and explains an APOD picture in Hebrew
  .post("/explain", validate("json", explainRequestSchema), async (c) => {
    const { date } = c.req.valid("json");

    if (!c.env.NASA_API_KEY || !c.env.GEMINI_API_KEY) {
      return fail(
        c,
        500,
        "missing_config",
        "Server API keys (NASA or Gemini) are not configured.",
      );
    }

    const supabase = createAdminClient(c.env);

    // Rule: Never pay twice for the same answer - check database cache first
    const { data: cached, error: cacheLookupError } = await supabase
      .from("nasa_pictures")
      .select("*")
      .eq("date", date)
      .maybeSingle();

    if (!cacheLookupError && cached) {
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
        `https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(c.env.NASA_API_KEY)}&date=${encodeURIComponent(date)}`,
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
      return fail(
        c,
        502,
        "nasa_error",
        "NASA returned an error for this date.",
      );
    }

    let apodData: {
      title?: string;
      explanation?: string;
      url?: string;
      media_type?: string;
    };
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

    const englishTitle = apodData.title ?? "Astronomy Picture";
    const englishExplanation = apodData.explanation ?? "";
    const imageUrl = apodData.url ?? "";
    const mediaType = apodData.media_type ?? "image";

    // Call Gemini REST API using fetch with structured JSON output
    const prompt = `You are an astronomy educator writing for children.
Read this NASA Astronomy Picture of the Day entry and generate:
1. "hebrewTitle": A clear, engaging Hebrew title.
2. "hebrewSummary": A simple explanation of 2 to 3 sentences in Hebrew, easy enough for a 10-year-old child to understand.
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
        response_mime_type: "application/json",
        response_schema: {
          type: "OBJECT",
          properties: {
            hebrewTitle: { type: "STRING" },
            hebrewSummary: { type: "STRING" },
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

    let geminiRes: Response;
    try {
      geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(c.env.GEMINI_API_KEY)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiBody),
        },
      );
    } catch (err) {
      console.error("Gemini network error:", err);
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
      return fail(
        c,
        502,
        "gemini_error",
        "Gemini AI service returned an error. Please try again.",
      );
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
      // Non-fatal for the user response, but log it
    }

    return c.json({
      date,
      hebrew_title: hebrewTitle,
      hebrew_summary: hebrewSummary,
      tags,
      cached: false,
    });
  });

