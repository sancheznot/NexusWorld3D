"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminColorField } from "@/components/admin/AdminColorField";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LandingBrandingConfig } from "@/types/landing.types";
import { DEFAULT_LANDING_CONFIG } from "@/types/landing.types";

const COLOR_FIELDS = [
  ["titleGradientFrom", "Título — inicio gradiente"],
  ["titleGradientTo", "Título — fin gradiente"],
  ["pageBackgroundFrom", "Fondo página — from"],
  ["pageBackgroundVia", "Fondo página — via"],
  ["pageBackgroundTo", "Fondo página — to"],
  ["primaryButtonFrom", "Botón primario — from"],
  ["primaryButtonTo", "Botón primario — to"],
  ["secondaryButtonFrom", "Botón secundario — from"],
  ["secondaryButtonTo", "Botón secundario — to"],
] as const;

export default function LandingBrandingPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mariaConfigured, setMariaConfigured] = useState(true);
  const [form, setForm] = useState<LandingBrandingConfig>(DEFAULT_LANDING_CONFIG);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/site-settings", {
        credentials: "include",
      });
      const data = await res.json();
      if (res.status === 401) {
        throw new Error(
          "Sesión inválida o expirada — vuelve a iniciar sesión en /admin/login / Session expired — sign in again at /admin/login"
        );
      }
      if (!res.ok) throw new Error(data.error || "Load failed");
      setMariaConfigured(data.mariaConfigured !== false);
      if (data.landing) setForm(data.landing as LandingBrandingConfig);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setField =
    (key: keyof LandingBrandingConfig) =>
    (value: string) => {
      setForm((f) => ({ ...f, [key]: value }));
    };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ landing: form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (data.landing) setForm(data.landing as LandingBrandingConfig);
      setMessage("Guardado correctamente / Saved successfully");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-3xl justify-center px-4 py-16 text-slate-400 sm:px-6">
        Cargando configuración del portal…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      {!mariaConfigured && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/35 px-4 py-3 text-sm text-amber-100">
          MariaDB no está configurado: los cambios no se pueden persistir. Define
          DATABASE_URL o MARIADB_* y ejecuta{" "}
          <code className="text-amber-200">npm run db:migrate</code>.
        </div>
      )}

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            message.includes("Error") || message.includes("failed")
              ? "border border-red-500/30 bg-red-950/40 text-red-100"
              : "border border-emerald-500/30 bg-emerald-950/35 text-emerald-100"
          }`}
        >
          {message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Textos / copy</CardTitle>
          <CardDescription>
            Títulos públicos del landing y portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="landing-title">Título principal</Label>
            <Input
              id="landing-title"
              value={form.title}
              onChange={(e) => setField("title")(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="landing-sub">Subtítulo</Label>
            <Input
              id="landing-sub"
              value={form.subtitle}
              onChange={(e) => setField("subtitle")(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="landing-tag">Tagline</Label>
            <Textarea
              id="landing-tag"
              value={form.tagline}
              onChange={(e) => setField("tagline")(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>URL absoluta o ruta bajo /public.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="landing-logo">URL del logo</Label>
            <Input
              id="landing-logo"
              value={form.logoUrl}
              onChange={(e) => setField("logoUrl")(e.target.value)}
              placeholder="/logo.png"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Colores</CardTitle>
          <CardDescription>
            Selector visual + hex. Los valores se guardan como texto (#rrggbb).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {COLOR_FIELDS.map(([key, label]) => (
              <AdminColorField
                key={key}
                id={key}
                label={label}
                value={form[key]}
                onChange={setField(key)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CTA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cta-primary">Texto botón demo</Label>
            <Input
              id="cta-primary"
              value={form.primaryCtaLabel}
              onChange={(e) => setField("primaryCtaLabel")(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cta-secondary">Texto botón admin</Label>
            <Input
              id="cta-secondary"
              value={form.secondaryCtaLabel}
              onChange={(e) => setField("secondaryCtaLabel")(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acceso al juego (/game)</CardTitle>
          <CardDescription>
            Textos del modal NextAuth. Proveedores vía variables de entorno.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gl-title">Título del modal</Label>
            <Input
              id="gl-title"
              value={form.gameLoginTitle}
              onChange={(e) => setField("gameLoginTitle")(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gl-sub">Subtítulo</Label>
            <Textarea
              id="gl-sub"
              value={form.gameLoginSubtitle}
              onChange={(e) => setField("gameLoginSubtitle")(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gl-ctrl">Título bloque &quot;Controles&quot;</Label>
            <Input
              id="gl-ctrl"
              value={form.gameLoginControlsTitle}
              onChange={(e) => setField("gameLoginControlsTitle")(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sección cámaras</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cam-title">Título</Label>
            <Input
              id="cam-title"
              value={form.camerasSectionTitle}
              onChange={(e) => setField("camerasSectionTitle")(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cam-hint">Descripción corta</Label>
            <Input
              id="cam-hint"
              value={form.camerasSectionHint}
              onChange={(e) => setField("camerasSectionHint")(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={() => void save()}
          disabled={saving || !mariaConfigured}
        >
          {saving ? "Guardando…" : "Guardar en base de datos"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void load()}
        >
          Recargar
        </Button>
      </div>
    </div>
  );
}
