import { describe, expect, it } from "vitest";
import { saveGameSchema } from "./games";

describe("saveGameSchema", () => {
  it("accepts a valid move list", () => {
    const valid = { moves: [0, 1, 2, 3, 5] };
    const parsed = saveGameSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects fewer than 5 moves", () => {
    const tooShort = { moves: [0, 1, 2] };
    const parsed = saveGameSchema.safeParse(tooShort);
    expect(parsed.success).toBe(false);
  });

  it("rejects moves that include cell 4 (the middle cell)", () => {
    const withCenter = { moves: [0, 4, 1, 3, 2] };
    const parsed = saveGameSchema.safeParse(withCenter);
    expect(parsed.success).toBe(false);
  });

  it("rejects moves with out of bounds indices", () => {
    const outOfBounds = { moves: [0, 1, 2, 3, 9] };
    const parsed = saveGameSchema.safeParse(outOfBounds);
    expect(parsed.success).toBe(false);
  });
});
