import { afterEach, describe, expect, it, vi } from "vitest";
import type { Bindings } from "../env";
import { nasa } from "./nasa";

const bindings: Bindings = {
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SECRET_KEY: "test-secret",
  GEMINI_API_KEY: "test-gemini-key",
};

const nasaItem = {
  date: "2015-03-14",
  title: "Return at Sunrise",
  explanation:
    "<strong>Explanation:</strong> The sky &amp; stars<br><a href='/'>shine</a>.",
  url: "https://science.nasa.gov/image-article/apod-example/",
  hdurl: "https://images.nasa.gov/example.jpg",
};

const geminiAnswer = {
  hebrewTitle: "זריחה יפה",
  hebrewSummary:
    "השמיים נראים בהירים כשהשמש זורחת. הכוכבים עדיין שם, אבל אור השמש מקשה לראות אותם.",
  tags: ["star"],
};

function installFetchMock(
  cachedPicture?: object,
  nasaErrorStatus?: number,
  geminiNetworkFailures = 0,
) {
  const calls: Array<{
    url: string;
    method: string;
    headers: Headers;
    body: string;
  }> = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : undefined;
      const url = request?.url ?? String(input);
      const method = init?.method ?? request?.method ?? "GET";
      const headers = new Headers(init?.headers ?? request?.headers);
      const body = typeof init?.body === "string" ? init.body : "";
      calls.push({ url, method, headers, body });

      if (url.startsWith(`${bindings.SUPABASE_URL}/rest/v1/nasa_pictures`)) {
        if (method === "GET") {
          return Response.json(cachedPicture ? [cachedPicture] : []);
        }
        return new Response(null, { status: 204 });
      }

      if (url.startsWith("https://science.nasa.gov/wp-json/wp/v2/apod-basic")) {
        if (nasaErrorStatus) {
          return new Response("NASA internal error details", {
            status: nasaErrorStatus,
          });
        }
        return url.includes("?page=")
          ? Response.json([nasaItem], {
              headers: { "X-WP-Total": "11463" },
            })
          : Response.json(nasaItem);
      }

      if (
        url ===
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent"
      ) {
        if (geminiNetworkFailures > 0) {
          geminiNetworkFailures--;
          throw new TypeError("fetch failed");
        }
        return Response.json({
          candidates: [
            { content: { parts: [{ text: JSON.stringify(geminiAnswer) }] } },
          ],
        });
      }

      return new Response("Unexpected request", { status: 500 });
    }),
  );

  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("NASA routes", () => {
  it("requests and returns up to 20 pictures with server-cleaned explanations", async () => {
    const calls = installFetchMock();
    const response = await nasa.request(
      "/apod?page=1&per_page=20",
      {},
      bindings,
    );

    expect(response.status).toBe(200);
    expect(calls[0]?.url).toBe(
      "https://science.nasa.gov/wp-json/wp/v2/apod-basic?page=1&per_page=20",
    );
    const body = await response.json();
    expect(body).toMatchObject({
      total: 11463,
      per_page: 20,
      pictures: [
        {
          explanation: "The sky & stars\nshine.",
          url: nasaItem.url,
          hdurl: nasaItem.hdurl,
        },
      ],
    });
  });

  it("returns a clear server error instead of NASA's upstream error body", async () => {
    installFetchMock(undefined, 503);
    const response = await nasa.request(
      "/apod?page=1&per_page=20",
      {},
      bindings,
    );
    const body = await response.text();

    expect(response.status).toBe(502);
    expect(body).toContain(
      "NASA's picture service is temporarily unavailable. Please try again later.",
    );
    expect(body).not.toContain("NASA internal error details");
  });

  it("uses NASA's date result and Gemini structured output, then caches it", async () => {
    const calls = installFetchMock();
    const response = await nasa.request(
      "/explain",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "2015-03-14" }),
      },
      bindings,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      date: "2015-03-14",
      hebrew_title: geminiAnswer.hebrewTitle,
      hebrew_summary: geminiAnswer.hebrewSummary,
      tags: geminiAnswer.tags,
      cached: false,
    });
    expect(
      calls.find((call) =>
        call.url.startsWith(
          "https://science.nasa.gov/wp-json/wp/v2/apod-basic/",
        ),
      )?.url,
    ).toBe("https://science.nasa.gov/wp-json/wp/v2/apod-basic/150314");

    const geminiCall = calls.find((call) =>
      call.url.includes("generativelanguage.googleapis.com"),
    );
    expect(geminiCall?.headers.get("x-goog-api-key")).toBe(
      bindings.GEMINI_API_KEY,
    );
    expect(geminiCall?.url).toContain("gemini-3.6-flash:generateContent");
    const geminiBody = JSON.parse(geminiCall?.body ?? "{}");
    expect(geminiBody.generationConfig.responseMimeType).toBe(
      "application/json",
    );
    expect(geminiBody.contents[0].parts[0].text).toContain(
      "The sky & stars\nshine.",
    );
    expect(geminiBody.contents[0].parts[0].text).not.toContain("<strong>");
    expect(calls.some((call) => call.method === "POST")).toBe(true);
  });

  it("retries Gemini network failures before returning a translation", async () => {
    const calls = installFetchMock(undefined, undefined, 1);
    const response = await nasa.request(
      "/explain",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "2015-03-14" }),
      },
      bindings,
    );

    expect(response.status).toBe(200);
    expect(
      calls.filter((call) =>
        call.url.includes("generativelanguage.googleapis.com"),
      ),
    ).toHaveLength(2);
  });

  it("returns the saved translation without calling NASA or Gemini again", async () => {
    const cached = {
      date: "2015-03-14",
      hebrew_title: "כבר נשמר",
      hebrew_summary: "זהו הסבר ראשון בעברית. וזהו ההסבר השני בעברית.",
      tags: ["star"],
    };
    const calls = installFetchMock(cached);
    const response = await nasa.request(
      "/explain",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "2015-03-14" }),
      },
      bindings,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ...cached,
      cached: true,
    });
    expect(calls).toHaveLength(1);
  });
});
