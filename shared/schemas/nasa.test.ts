import { describe, expect, it } from "vitest";
import { explainRequestSchema, geminiExplanationSchema } from "./nasa";

describe("NASA schemas", () => {
  describe("explainRequestSchema", () => {
    it("accepts valid YYYY-MM-DD date", () => {
      const res = explainRequestSchema.safeParse({ date: "2024-05-12" });
      expect(res.success).toBe(true);
    });

    it("rejects invalid date format", () => {
      expect(
        explainRequestSchema.safeParse({ date: "12-05-2024" }).success,
      ).toBe(false);
      expect(explainRequestSchema.safeParse({ date: "invalid" }).success).toBe(
        false,
      );
      expect(explainRequestSchema.safeParse({}).success).toBe(false);
    });
  });

  describe("geminiExplanationSchema", () => {
    it("accepts valid structured output from Gemini", () => {
      const valid = {
        hebrewTitle: "ערפילית הטבעת",
        hebrewSummary:
          "זוהי ערפילית יפהפייה בחלל העמוק שנוצרה מכוכב שסיים את חייו. היא זוהרת בצבעים מרהיבים.",
        tags: ["nebula", "star"],
      };
      const res = geminiExplanationSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it("rejects unrecognized tags (prompt injection or hallucination)", () => {
      const invalidTag = {
        hebrewTitle: "ערפילית",
        hebrewSummary: "הסבר פשוט בעברית באורך מספק.",
        tags: ["hacked"],
      };
      const res = geminiExplanationSchema.safeParse(invalidTag);
      expect(res.success).toBe(false);
    });

    it("rejects empty tags or more than 5 tags", () => {
      const emptyTags = {
        hebrewTitle: "ערפילית",
        hebrewSummary: "הסבר פשוט בעברית באורך מספק.",
        tags: [],
      };
      expect(geminiExplanationSchema.safeParse(emptyTags).success).toBe(false);

      const tooManyTags = {
        hebrewTitle: "ערפילית",
        hebrewSummary: "הסבר פשוט בעברית באורך מספק.",
        tags: ["nebula", "star", "galaxy", "sun", "moon", "planet"],
      };
      expect(geminiExplanationSchema.safeParse(tooManyTags).success).toBe(
        false,
      );
    });

    it("rejects empty title or too-short summary", () => {
      const emptyTitle = {
        hebrewTitle: "   ",
        hebrewSummary: "הסבר פשוט בעברית באורך מספק.",
        tags: ["nebula"],
      };
      expect(geminiExplanationSchema.safeParse(emptyTitle).success).toBe(false);
    });
  });
});
