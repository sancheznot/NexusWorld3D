"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminAuditListRow } from "@/lib/db/adminAudit";
import { adminCard, adminTableWrap } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";

export default function AdminAuditPanel() {
  const [rows, setRows] = useState<AdminAuditListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const limit = 30;

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/admin/audit-log?limit=${limit}&offset=${offset}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (res.status === 401) {
        setMsg("Sesión expirada.");
        return;
      }
      if (!res.ok) throw new Error(data.error || "Error");
      if (data.mariaConfigured === false) {
        setMsg("MariaDB no configurado — sin tabla admin_audit.");
        setRows([]);
        setTotal(0);
        return;
      }
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setMsg("No se pudo cargar el historial.");
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
        <div className="max-w-xl">
          <h2 className="text-xl font-bold tracking-tight text-white">
            Auditoría del panel
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Acciones guardadas en{" "}
            <code className="rounded bg-slate-800 px-1 text-cyan-300">
              admin_audit
            </code>{" "}
            (portal, usuarios, etc.)
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void load()}
          disabled={loading}
        >
          Refrescar
        </Button>
      </div>

      {msg && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-center text-sm text-amber-100 sm:text-left">
          {msg}
        </div>
      )}

      <div className={`${adminCard} p-4`}>
        <p className="mb-3 text-center text-xs text-slate-500 sm:text-left">
          Total: <span className="font-mono text-cyan-300">{total}</span>{" "}
          registros
        </p>
        <div className={adminTableWrap}>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-white/10 bg-slate-900/80 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-3">Fecha</th>
                <th className="p-3">Admin</th>
                <th className="p-3">Acción</th>
                <th className="p-3">Entidad</th>
                <th className="p-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Cargando…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Sin registros aún.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-white/5 hover:bg-white/[0.03]"
                  >
                    <td className="whitespace-nowrap p-3 font-mono text-xs text-slate-400">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 text-slate-200">{r.adminUsername}</td>
                    <td className="p-3 text-cyan-200/90">{r.action}</td>
                    <td className="p-3 text-xs text-slate-500">
                      {r.entityType ?? "—"}
                      {r.entityId ? (
                        <span className="block max-w-[200px] truncate font-mono text-slate-400">
                          {r.entityId}
                        </span>
                      ) : null}
                      {r.payload != null ? (
                        <pre className="mt-1 max-h-16 overflow-auto rounded bg-black/40 p-1 text-[10px] text-slate-500">
                          {JSON.stringify(r.payload)}
                        </pre>
                      ) : null}
                    </td>
                    <td className="p-3 font-mono text-xs text-slate-500">
                      {r.ip ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-between">
          <Button
            type="button"
            variant="secondary"
            disabled={offset === 0 || loading}
            onClick={() => setOffset((o) => Math.max(0, o - limit))}
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={offset + limit >= total || loading}
            onClick={() => setOffset((o) => o + limit)}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
