import { z } from "zod";

/** Allowed tags for Gemini classification of NASA APOD pictures. */
export const ALLOWED_NASA_TAGS = [
  "galaxy",
  "planet",
  "nebula",
  "earth",
  "sun",
  "star",
  "black hole",
  "telescope",
  "moon",
  "asteroid",
] as const;

export type NasaTag = (typeof ALLOWED_NASA_TAGS)[number];

/** Schema for client request to explain a picture in Hebrew (date only!). */
export const explainRequestSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD"),
});

export type ExplainRequestInput = z.infer<typeof explainRequestSchema>;

function hasTwoOrThreeSentences(summary: string): boolean {
  const sentenceCount =
    summary.match(/[.!?؟](?=["'״׳”’)]*(?:\s|$))/g)?.length ?? 0;
  return sentenceCount >= 2 && sentenceCount <= 3;
}

/** Schema for validating structured Gemini LLM output. */
export const geminiExplanationSchema = z.object({
  hebrewTitle: z.string().trim().min(1, "Title cannot be empty"),
  hebrewSummary: z
    .string()
    .trim()
    .min(10, "Summary must be at least 10 characters")
    .refine(hasTwoOrThreeSentences, "Summary must contain 2 to 3 sentences"),
  tags: z
    .array(z.enum(ALLOWED_NASA_TAGS))
    .min(1, "Must contain at least 1 tag")
    .max(5, "Cannot contain more than 5 tags"),
});

export type GeminiExplanation = z.infer<typeof geminiExplanationSchema>;

/** An APOD picture item returned to the browser. */
export const apodCardSchema = z.object({
  date: z.string(),
  title: z.string(),
  explanation: z.string(),
  url: z.string(),
  media_type: z.string(),
  hdurl: z.string().nullish(),
  hebrew: z
    .object({
      title: z.string(),
      summary: z.string(),
      tags: z.array(z.string()),
    })
    .nullable(),
});

export type ApodCard = z.infer<typeof apodCardSchema>;

/** A page of newest-first APOD pictures and the upstream pagination totals. */
export const apodPageSchema = z.object({
  pictures: z.array(apodCardSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  per_page: z.number().int().positive(),
  total_pages: z.number().int().nonnegative(),
});

export type ApodPage = z.infer<typeof apodPageSchema>;

/** Response returned when an explanation is generated or fetched from cache. */
export const explainResponseSchema = z.object({
  date: z.string(),
  hebrew_title: z.string(),
  hebrew_summary: z.string(),
  tags: z.array(z.string()),
  cached: z.boolean(),
});

export type ExplainResponse = z.infer<typeof explainResponseSchema>;
