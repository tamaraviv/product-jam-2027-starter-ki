import type {
  ApodCard,
  ExplainRequestInput,
  ExplainResponse,
} from "@shared/schemas/nasa";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";

export const nasaKeys = {
  all: ["nasa"] as const,
  apod: (count: number, seed: number) => ["nasa", "apod", count, seed] as const,
};

/** Fetches random NASA APOD pictures. Returns a shuffle() to load a fresh random set. */
export function useNasaPictures(count = 20) {
  const [seed, setSeed] = useState(() => Date.now());

  const query = useQuery({
    queryKey: nasaKeys.apod(count, seed),
    queryFn: () =>
      api<ApodCard[]>(`/api/nasa/apod?count=${count}&refresh=${seed}`),
    // Every seed value is a unique cache entry — no stale concern needed
    staleTime: Infinity,
  });

  /** Calling shuffle() bumps the seed → new query key → fresh NASA API call. */
  function shuffle() {
    setSeed((current) => current + 1);
  }

  return { ...query, seed, shuffle };
}

/** Requests Gemini to explain a picture in Hebrew and saves it to the database cache. */
export function useExplainPicture(count: number, seed: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ExplainRequestInput) =>
      api<ExplainResponse>("/api/nasa/explain", {
        method: "POST",
        body: input,
      }),
    onSuccess: (result) => {
      // Optimistically update the picture in the local React Query cache
      queryClient.setQueryData<ApodCard[]>(
        nasaKeys.apod(count, seed),
        (old) => {
          if (!old) return old;
          return old.map((card) =>
            card.date === result.date
              ? {
                  ...card,
                  hebrew: {
                    title: result.hebrew_title,
                    summary: result.hebrew_summary,
                    tags: result.tags,
                  },
                }
              : card,
          );
        },
      );
    },
  });
}
