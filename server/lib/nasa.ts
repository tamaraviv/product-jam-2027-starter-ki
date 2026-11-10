export type RawApodItem = {
  date: string;
  title: string;
  explanation: string;
  url: string;
  hdurl?: string | null;
};

const namedEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  copy: "©",
  deg: "°",
  delta: "δ",
  euro: "€",
  frac12: "½",
  gt: ">",
  hellip: "…",
  infin: "∞",
  ldquo: "“",
  lsquo: "‘",
  lt: "<",
  mdash: "—",
  micro: "µ",
  nbsp: " ",
  ndash: "–",
  plusmn: "±",
  quot: '"',
  reg: "®",
  rdquo: "”",
  rsquo: "’",
  times: "×",
  trade: "™",
};

function decodeHtmlEntity(entity: string, value: string): string {
  if (value.startsWith("#")) {
    const codePoint =
      value[1]?.toLowerCase() === "x"
        ? Number.parseInt(value.slice(2), 16)
        : Number.parseInt(value.slice(1), 10);
    if (
      Number.isInteger(codePoint) &&
      codePoint > 0 &&
      codePoint <= 0x10ffff &&
      !(codePoint >= 0xd800 && codePoint <= 0xdfff)
    ) {
      return String.fromCodePoint(codePoint);
    }
    return entity;
  }

  return namedEntities[value.toLowerCase()] ?? entity;
}

/** Converts NASA's HTML explanation to plain text while preserving its words. */
export function cleanApodExplanation(html: string): string {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<br\s*\/?>|<\/(?:p|div|li|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#(?:x[\da-f]+|\d+)|[a-z][\da-z]+);/gi, decodeHtmlEntity)
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .replace(/^Explanation:\s*/i, "");
}

export function toApodDateSlug(date: string): string {
  return `${date.slice(2, 4)}${date.slice(5, 7)}${date.slice(8, 10)}`;
}

export function isRawApodItem(value: unknown): value is RawApodItem {
  if (typeof value !== "object" || value === null) return false;

  const item = value as Record<string, unknown>;
  return (
    typeof item.date === "string" &&
    typeof item.title === "string" &&
    typeof item.explanation === "string" &&
    typeof item.url === "string" &&
    (item.hdurl === undefined ||
      item.hdurl === null ||
      typeof item.hdurl === "string")
  );
}
