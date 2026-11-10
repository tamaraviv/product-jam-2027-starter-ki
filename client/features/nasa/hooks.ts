import type {
  ApodPage,
  ExplainRequestInput,
  ExplainResponse,
} from "@shared/schemas/nasa";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";

export const nasaKeys = {
  all: ["nasa"] as const,
  apod: (perPage: number, page: number) =>
    ["nasa", "apod", perPage, page] as const,
};

/** Fetches a newest-first page of NASA pictures. */
export function useNasaPictures(perPage = 20) {
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: nasaKeys.apod(perPage, page),
    queryFn: () =>
      api<ApodPage>(`/api/nasa/apod?page=${page}&per_page=${perPage}`),
  });

  return { ...query, page, setPage };
}

/** Requests Gemini to explain a picture in Hebrew and saves it to the database cache. */
export function useExplainPicture(perPage: number, page: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ExplainRequestInput) =>
      api<ExplainResponse>("/api/nasa/explain", {
        method: "POST",
        body: input,
      }),
    onSuccess: (result) => {
      // Optimistically update the picture in the local React Query cache
      queryClient.setQueryData<ApodPage>(
        nasaKeys.apod(perPage, page),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pictures: old.pictures.map((card) =>
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
            ),
          };
        },
      );
    },
  });
}
