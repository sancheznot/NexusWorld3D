"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { worldManagerClient, type WorldData } from "@/core/worlds-client";
import AdvancedWorldEditor from "@/components/admin/AdvancedWorldEditor";
import AssetPanel from "@/components/admin/AssetPanel";
import LandingBrandingPanel from "@/components/admin/LandingBrandingPanel";
import GameServerMonitorPanel from "@/components/admin/GameServerMonitorPanel";
import AdminTabNav, { type AdminTabId } from "@/components/admin/AdminTabNav";
import AdminAuditPanel from "@/components/admin/AdminAuditPanel";
import AdminAuthUsersPanel from "@/components/admin/AdminAuthUsersPanel";
import {
  adminBtnDanger,
  adminBtnPrimary,
  adminBtnSuccess,
  adminCard,
  adminHeaderBar,
  adminPageBg,
} from "@/components/admin/admin-ui";

function loginUrlWithNext(pathWithQuery: string): string {
  return `/admin/login?next=${encodeURIComponent(pathWithQuery)}`;
}

const VALID_TABS: AdminTabId[] = [
  "worlds",
  "editor",
  "assets",
  "landing",
  "monitor",
  "audit",
  "users",
];

function AdminPanelContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [worlds, setWorlds] = useState<WorldData[]>([]);
  const [selectedWorld, setSelectedWorld] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTabId>("worlds");

  const setTab = useCallback(
    (t: AdminTabId) => {
      setActiveTab(t);
      const q = new URLSearchParams(searchParams.toString());
      q.set("tab", t);
      router.replace(`/admin/panel?${q.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && VALID_TABS.includes(t as AdminTabId)) {
      setActiveTab(t as AdminTabId);
    }
  }, [searchParams]);

  useEffect(() => {
    const nextPath =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/admin/panel";

    const checkAuth = async () => {
      try {
        const response = await fetch("/api/admin/verify", {
          credentials: "include",
        });
        const data = await response.json();

        if (data.authenticated) {
          setIsAuthenticated(true);
          loadWorlds();
        } else {
          router.replace(loginUrlWithNext(nextPath));
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        router.replace(loginUrlWithNext(nextPath));
      } finally {
        setIsLoading(false);
      }
    };

    void checkAuth();
  }, [router]);

  const loadWorlds = async () => {
    try {
      const worldsList = await worldManagerClient.listWorlds();
      setWorlds(worldsList);
    } catch (error) {
      console.error("Error loading worlds:", error);
    }
  };

  const handleWorldSelect = (worldId: string) => {
    setSelectedWorld(worldId);
    setTab("editor");
  };

  const handleCreateWorld = async () => {
    const name = prompt("Nombre del mundo / World name:");
    if (!name) return;

    const id = name.toLowerCase().replace(/\s+/g, "-");
    const result = await worldManagerClient.createWorld(id, name);

    if (result.success) {
      loadWorlds();
      setSelectedWorld(id);
      setTab("editor");
    } else {
      alert(result.error || "Failed to create world");
    }
  };

  const handleDeleteWorld = async (worldId: string) => {
    if (!confirm("¿Eliminar este mundo? / Delete this world?")) return;

    const result = await worldManagerClient.deleteWorld(worldId);

    if (result.success) {
      loadWorlds();
      if (selectedWorld === worldId) {
        setSelectedWorld(null);
        setTab("worlds");
      }
    } else {
      alert(result.error || "Failed to delete world");
    }
  };

  const handleLogout = () => {
    document.cookie =
      "admin_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    router.push("/admin/login");
  };

  if (isLoading) {
    return (
      <div
        className={`${adminPageBg} flex items-center justify-center px-4`}
      >
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <p className="text-slate-300">Cargando panel…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={`${adminPageBg} flex min-h-screen flex-col`}>
      <header className={`${adminHeaderBar} shrink-0`}>
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/80">
              NexusWorld3D
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Panel de administración
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Mundos, assets, portal público, monitor y base de datos
            </p>
            <Link
              href="/admin"
              className="mt-2 inline-block text-sm text-cyan-400 hover:text-cyan-300"
            >
              ← Página pública del proyecto
            </Link>
          </div>
          <button type="button" onClick={handleLogout} className={adminBtnDanger}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <AdminTabNav
        active={activeTab}
        onChange={setTab}
        editorDisabled={!selectedWorld}
      />

      <main className="mx-auto w-full max-w-[1600px] flex-1 pb-12">
        {activeTab === "worlds" && (
          <div className="px-4 py-6 sm:px-6">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-white">Mundos</h2>
              <button
                type="button"
                onClick={handleCreateWorld}
                className={adminBtnSuccess}
              >
                + Nuevo mundo
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {worlds.map((world) => (
                <div key={world.id} className={`${adminCard} p-5`}>
                  <h3 className="text-lg font-semibold text-white">
                    {world.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">{world.description}</p>
                  <div className="mt-4 space-y-1 text-xs text-slate-500">
                    <div>Objetos: {world.objects.length}</div>
                    <div>
                      Creado: {new Date(world.createdAt).toLocaleDateString()}
                    </div>
                    <div>
                      Actualizado:{" "}
                      {new Date(world.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="mt-5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleWorldSelect(world.id)}
                      className={`${adminBtnPrimary} flex-1`}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteWorld(world.id)}
                      className={adminBtnDanger}
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {worlds.length === 0 && (
              <div className={`${adminCard} py-16 text-center`}>
                <div className="text-5xl opacity-40">🌍</div>
                <h3 className="mt-4 text-lg font-semibold text-slate-300">
                  Aún no hay mundos
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Crea el primero para abrir el editor
                </p>
                <button
                  type="button"
                  onClick={handleCreateWorld}
                  className={`${adminBtnPrimary} mt-6`}
                >
                  Crear mundo
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "editor" && selectedWorld && (
          <AdvancedWorldEditor
            worldId={selectedWorld}
            onSave={() => {
              loadWorlds();
            }}
            onClose={() => setTab("worlds")}
          />
        )}

        {activeTab === "assets" && (
          <div className="flex min-h-[480px]">
            <div className="flex-1">
              <AssetPanel
                onAssetSelect={(asset) => {
                  console.log("Asset selected:", asset);
                }}
              />
            </div>
          </div>
        )}

        {activeTab === "landing" && <LandingBrandingPanel />}

        {activeTab === "monitor" && (
          <div className="border-t border-white/5">
            <GameServerMonitorPanel />
          </div>
        )}

        {activeTab === "audit" && <AdminAuditPanel />}

        {activeTab === "users" && <AdminAuthUsersPanel />}
      </main>
    </div>
  );
}

export default function AdminPanelPage() {
  return (
    <Suspense
      fallback={
        <div
          className={`${adminPageBg} flex min-h-screen items-center justify-center text-slate-300`}
        >
          Cargando…
        </div>
      }
    >
      <AdminPanelContent />
    </Suspense>
  );
}
