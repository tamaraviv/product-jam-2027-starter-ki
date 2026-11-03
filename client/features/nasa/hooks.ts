import type {
  ApodCard,
  ExplainRequestInput,
  ExplainResponse,
} from "@shared/schemas/nasa";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export const nasaKeys = {
  all: ["nasa"] as const,
  apod: (count: number) => ["nasa", "apod", count] as const,
};

/** Fetches random NASA APOD pictures. */
export function useNasaPictures(count = 10) {
  return useQuery({
    queryKey: nasaKeys.apod(count),
    queryFn: () => api<ApodCard[]>(`/api/nasa/apod?count=${count}`),
    // NASA APOD pictures are daily; keep cached while viewing
    staleTime: 1000 * 60 * 15,
  });
}

/** Requests Gemini to explain a picture in Hebrew and saves it to the database cache. */
export function useExplainPicture(count = 10) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ExplainRequestInput) =>
      api<ExplainResponse>("/api/nasa/explain", {
        method: "POST",
        body: input,
      }),
    onSuccess: (result) => {
      // Optimistically update the picture in the local React Query cache
      queryClient.setQueryData<ApodCard[]>(nasaKeys.apod(count), (old) => {
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
      });
    },
  });
}
