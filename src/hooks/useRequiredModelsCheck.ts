"use client";

import { useCallback, useEffect, useState } from "react";

export type MissingModelEntry = {
  path: string;
  url: string;
  shippedInRepo?: boolean;
  optional?: boolean;
  usedBy?: string[];
};

export type RequiredModelsCheckResponse = {
  ok: boolean;
  tier: string;
  missing: MissingModelEntry[];
  optionalMissing: MissingModelEntry[];
  presentCount: number;
  docsPath: string;
  validateCommand: string;
  error?: string;
};

const FRAMEWORK_DEMO =
  typeof process.env.NEXT_PUBLIC_FRAMEWORK_DEMO === "string" &&
  process.env.NEXT_PUBLIC_FRAMEWORK_DEMO === "1";

export function useRequiredModelsCheck(enabled = true) {
  const [data, setData] = useState<RequiredModelsCheckResponse | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = FRAMEWORK_DEMO ? "frameworkDemo=1" : "frameworkDemo=0";
      const res = await fetch(`/api/public/required-models?${qs}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as RequiredModelsCheckResponse;
      if (!res.ok) {
        setError(json.error ?? "Error comprobando modelos");
        setData(null);
        return;
      }
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [enabled, refresh]);

  const hasBlockingMissing = (data?.missing?.length ?? 0) > 0;

  return {
    data,
    loading,
    error,
    refresh,
    hasBlockingMissing,
    frameworkDemo: FRAMEWORK_DEMO,
  };
}
