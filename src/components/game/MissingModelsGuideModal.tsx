"use client";

import { AlertTriangle, Copy, FolderOpen, RefreshCw } from "lucide-react";
import { useCallback, useState } from "react";
import { GameButton } from "@/components/ui/GameButton";
import type {
  MissingModelEntry,
  RequiredModelsCheckResponse,
} from "@/hooks/useRequiredModelsCheck";

interface MissingModelsGuideModalProps {
  isOpen: boolean;
  loading: boolean;
  data: RequiredModelsCheckResponse | null;
  error: string | null;
  onRefresh: () => void;
  onDismiss: () => void;
}

function publicPathFromAssetPath(assetPath: string): string {
  return assetPath.replace(/^public\//, "");
}

function MissingAssetRow({ asset }: { asset: MissingModelEntry }) {
  const [copied, setCopied] = useState(false);
  const diskPath = publicPathFromAssetPath(asset.path);

  const copyPath = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(diskPath);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [diskPath]);

  return (
    <li className="rounded-lg border border-red-500/25 bg-red-950/20 p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs text-red-200 break-all">{diskPath}</p>
          <p className="mt-1 text-xs text-slate-400">
            URL en juego:{" "}
            <code className="rounded bg-black/40 px-1 text-cyan-200/90">
              {asset.url}
            </code>
          </p>
          {asset.shippedInRepo && (
            <p className="mt-1 text-xs text-amber-200/90">
              Debería venir con el template — haz{" "}
              <code className="rounded bg-black/30 px-1">git pull</code> o
              vuelve a clonar.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void copyPath()}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300 hover:bg-white/10"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Copiado" : "Copiar ruta"}
        </button>
      </div>
    </li>
  );
}

export default function MissingModelsGuideModal({
  isOpen,
  loading,
  data,
  error,
  onRefresh,
  onDismiss,
}: MissingModelsGuideModalProps) {
  const missing = data?.missing ?? [];
  const optionalMissing = data?.optionalMissing ?? [];
  const validateCmd = data?.validateCommand ?? "npm run validate-required-models -- --strict";

  if (!isOpen) return null;

  const handleDismiss = () => {
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-3 sm:p-4">
      <div className="relative flex max-h-[min(92dvh,900px)] w-full max-w-2xl flex-col overflow-y-auto rounded-2xl border border-amber-500/35 bg-slate-900/95 shadow-[0_0_48px_rgba(251,191,36,0.12)] backdrop-blur-md">
        <div className="border-b border-white/10 px-5 py-4 sm:px-7">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-500/15 p-2 text-amber-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                Faltan modelos 3D
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Missing 3D assets — the game needs files under{" "}
                <code className="rounded bg-black/40 px-1">public/models/</code>{" "}
                before the character creator and world can load correctly.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-7">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-100">
              {error}
            </div>
          ) : (
            <>
              <section>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-amber-300">
                  Archivos obligatorios ({data?.tier ?? "boot"})
                </h3>
                <ul className="space-y-2">
                  {missing.map((asset) => (
                    <MissingAssetRow key={asset.path} asset={asset} />
                  ))}
                </ul>
              </section>

              {optionalMissing.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-slate-400">
                    Opcionales (UI / recomendados)
                  </h3>
                  <ul className="space-y-1 text-xs text-slate-500">
                    {optionalMissing.map((asset) => (
                      <li key={asset.path} className="font-mono break-all">
                        {publicPathFromAssetPath(asset.path)}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-cyan-200">
                  <FolderOpen className="h-4 w-4" />
                  <h3 className="text-sm font-semibold">
                    Dónde colocarlos / Where to put files
                  </h3>
                </div>
                <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
                  <li>
                    Cada URL del juego{" "}
                    <code className="rounded bg-black/40 px-1">/models/…</code>{" "}
                    corresponde a un archivo en{" "}
                    <code className="rounded bg-black/40 px-1">
                      public/models/…
                    </code>{" "}
                    (misma ruta sin la barra inicial).
                  </li>
                  <li>
                    Ejemplo:{" "}
                    <code className="rounded bg-black/40 px-1">
                      /models/characters/men/men-all.glb
                    </code>{" "}
                    →{" "}
                    <code className="rounded bg-black/40 px-1">
                      public/models/characters/men/men-all.glb
                    </code>
                  </li>
                  <li>
                    Los personajes base (
                    <code className="rounded bg-black/40 px-1">men-all.glb</code>
                    ,{" "}
                    <code className="rounded bg-black/40 px-1">
                      women-all.glb
                    </code>
                    ) vienen con el template en git. Ciudad, vehículos y props
                    los añades tú o desde tu CDN/S3.
                  </li>
                  <li>
                    Tras copiar archivos, en la raíz del repo ejecuta:
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-black/50 p-3 font-mono text-xs text-emerald-200">
                      {validateCmd}
                    </pre>
                  </li>
                  <li>
                    Documentación completa:{" "}
                    <code className="rounded bg-black/40 px-1">
                      docs/REQUIRED_MODELS.md
                    </code>{" "}
                    y manifiesto{" "}
                    <code className="rounded bg-black/40 px-1">
                      content/required-models.json
                    </code>
                    .
                  </li>
                </ol>
              </section>
            </>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          <GameButton
            type="button"
            variant="modern"
            className="w-full sm:w-auto"
            onClick={() => void onRefresh()}
            disabled={loading}
          >
            <RefreshCw className="mr-2 inline h-4 w-4" />
            Reintentar comprobación
          </GameButton>
          <GameButton
            type="button"
            variant="neon"
            className="w-full sm:w-auto"
            onClick={handleDismiss}
          >
            Continuar de todos modos
          </GameButton>
        </div>
      </div>
    </div>
  );
}
