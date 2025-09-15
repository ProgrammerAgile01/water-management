// lib/use-blok-list.ts
"use client";

import useSWR from "swr";
import { jsonFetcher } from "./fetcher";
import { BlokListResp } from "./meter-blok-types";

export function useBlokList(periode: string | null, zona?: string | null) {
  if (!periode)
    return {
      data: undefined,
      isLoading: false,
      error: null,
      key: null as string | null,
    };

  const qs = new URLSearchParams({ periode });
  if (zona) qs.set("zona", zona);
  const key = `/api/catat-meter-blok?${qs.toString()}`;
  const swr = useSWR<BlokListResp>(key, jsonFetcher, {
    revalidateOnFocus: false,
  });

  return { ...swr, key };
}
