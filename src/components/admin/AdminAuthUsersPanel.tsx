"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuthUserListRow } from "@/lib/db/authUsersAdmin";
import { adminCard, adminTableWrap } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";

export default function AdminAuthUsersPanel() {
  const [rows, setRows] = useState<AuthUserListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const limit = 25;

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/admin/auth-users?limit=${limit}&offset=${offset}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (res.status === 401) {
        setMsg("Sesión expirada.");
        return;
      }
      if (!res.ok) throw new Error(data.error || "Error");
      if (data.mariaConfigured === false) {
        setMsg(
          "MariaDB no configurado o tablas Auth.js ausentes — ejecuta migraciones."
        );
        setRows([]);
        setTotal(0);
        return;
      }
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setMsg("No se pudo cargar usuarios.");
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (u: AuthUserListRow) => {
    if (
      !confirm(
        `¿Eliminar usuario ${u.email}?\nSe borrarán cuentas vinculadas (Discord, email, etc.). Irreversible.`
      )
    ) {
      return;
    }
    setDeleting(u.id);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/admin/auth-users/${encodeURIComponent(u.id)}`,
        { method: "DELETE", credentials: "include" }
      );
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "No se pudo eliminar.");
        return;
      }
      await load();
    } catch {
      setMsg("Error de red al eliminar.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
        <div className="max-w-xl">
          <h2 className="text-xl font-bold tracking-tight text-white">
            Jugadores (NextAuth)
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Usuarios en{" "}
            <code className="rounded bg-slate-800 px-1 text-violet-300">
              auth_user
            </code>
            . Borrar elimina enlaces OAuth.
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
          Total: <span className="font-mono text-violet-300">{total}</span>{" "}
          cuentas
        </p>
        <div className={adminTableWrap}>
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-white/10 bg-slate-900/80 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-3">Email</th>
                <th className="p-3">Nombre</th>
                <th className="p-3">Proveedores</th>
                <th className="p-3">ID</th>
                <th className="w-28 p-3" />
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
                    Ningún usuario registrado aún.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-white/5 hover:bg-white/[0.03]"
                  >
                    <td className="p-3 font-medium text-slate-200">{r.email}</td>
                    <td className="p-3 text-slate-400">{r.name ?? "—"}</td>
                    <td className="p-3 text-xs text-cyan-300/90">{r.providers}</td>
                    <td className="max-w-[140px] break-all p-3 font-mono text-[10px] text-slate-600">
                      {r.id}
                    </td>
                    <td className="p-3">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={deleting === r.id}
                        onClick={() => void handleDelete(r)}
                      >
                        {deleting === r.id ? "…" : "Eliminar"}
                      </Button>
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
