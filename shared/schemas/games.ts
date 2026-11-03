import { z } from "zod";
import { BLOCKED_CELL, TOTAL_PLAYABLE_CELLS } from "../game";

/** A game record as returned by the API. */
export const gameSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  variant: z.literal("no-center"),
  moves: z.array(z.number().int().min(0).max(8)),
  result: z.enum(["x_won", "o_won", "draw"]),
  created_at: z.string(),
});

export type Game = z.infer<typeof gameSchema>;

/** What the browser sends to save a finished game. */
export const saveGameSchema = z.object({
  moves: z
    .array(
      z
        .number()
        .int({ message: "Cell index must be an integer" })
        .min(0, "Cell index cannot be negative")
        .max(8, "Cell index must be between 0 and 8")
        .refine((cell) => cell !== BLOCKED_CELL, {
          message: "Middle cell (4) cannot be played in no-center variant",
        }),
    )
    .min(5, "A game must have at least 5 moves to reach a conclusion")
    .max(
      TOTAL_PLAYABLE_CELLS,
      "A game cannot have more moves than playable cells",
    ),
});

export type SaveGameInput = z.infer<typeof saveGameSchema>;
