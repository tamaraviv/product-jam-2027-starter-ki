import { replayMoves } from "@shared/game";
import { saveGameSchema } from "@shared/schemas/games";
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { fail, validate } from "../lib/errors";
import { createAdminClient } from "../lib/supabase";

const COLUMNS = "id, owner_id, variant, moves, result, created_at";

export const games = new Hono<AppEnv>()
  // GET /api/games - lists the logged-in user's games, newest first.
  .get("/", async (c) => {
    const supabase = createAdminClient(c.env);
    const { data, error } = await supabase
      .from("games")
      .select(COLUMNS)
      .eq("owner_id", c.get("user").id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("list games failed:", error);
      return fail(c, 500, "database_error", "Could not load games.");
    }

    return c.json(data);
  })

  // POST /api/games - verifies and saves a finished game.
  .post("/", validate("json", saveGameSchema), async (c) => {
    const input = c.req.valid("json");

    // The server never trusts the browser: replay every move with pure rule functions
    const replay = replayMoves(input.moves);
    if (!replay.ok) {
      return fail(c, 400, "invalid_game", replay.error);
    }

    const supabase = createAdminClient(c.env);
    const { data, error } = await supabase
      .from("games")
      .insert({
        owner_id: c.get("user").id,
        variant: "no-center",
        moves: input.moves,
        result: replay.result,
      })
      .select(COLUMNS)
      .single();

    if (error) {
      console.error("save game failed:", error);
      return fail(c, 500, "database_error", "Could not save the game.");
    }

    return c.json(data, 201);
  });
