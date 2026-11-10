import { describe, expect, it } from "vitest";
import { cleanApodExplanation, toApodDateSlug } from "./nasa";

describe("NASA helpers", () => {
  it("cleans NASA explanation markup and decodes entities", () => {
    expect(
      cleanApodExplanation(
        "<strong>Explanation:</strong> Stars &amp; planets<br><a href='/'>shine</a> &#8217;brightly&#8217;.",
      ),
    ).toBe("Stars & planets\nshine ’brightly’.");
  });

  it("converts a date to NASA's YYMMDD slug", () => {
    expect(toApodDateSlug("2015-03-14")).toBe("150314");
  });
});
