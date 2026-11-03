import type { Game, SaveGameInput } from "@shared/schemas/games";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export const gameKeys = {
  all: ["games"] as const,
};

/** Fetches all saved games for the current user, newest first. */
export function useGames() {
  return useQuery({
    queryKey: gameKeys.all,
    queryFn: () => api<Game[]>("/api/games"),
  });
}

/** Saves a finished game by sending its move sequence to the server. */
export function useSaveGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveGameInput) =>
      api<Game>("/api/games", { method: "POST", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: gameKeys.all });
    },
  });
}
