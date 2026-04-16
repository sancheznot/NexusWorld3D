"use client";

import { adminTabActive, adminTabBar, adminTabIdle } from "@/components/admin/admin-ui";

export type AdminTabId =
  | "worlds"
  | "editor"
  | "assets"
  | "scenes"
  | "landing"
  | "monitor"
  | "audit"
  | "users";

type TabDef = { id: AdminTabId; label: string; disabled?: boolean };

type Props = {
  active: AdminTabId;
  onChange: (id: AdminTabId) => void;
  editorDisabled: boolean;
};

const TABS: TabDef[] = [
  { id: "worlds", label: "Mundos" },
  { id: "editor", label: "Editor" },
  { id: "assets", label: "Assets" },
  { id: "scenes", label: "Escenas v0.1" },
  { id: "landing", label: "Portal" },
  { id: "monitor", label: "Monitor juego" },
  { id: "audit", label: "Auditoría" },
  { id: "users", label: "Jugadores (Auth)" },
];

export default function AdminTabNav({ active, onChange, editorDisabled }: Props) {
  return (
    <div className={`${adminTabBar} shrink-0`}>
      <nav
        className="mx-auto flex max-w-[1600px] flex-wrap justify-center gap-2 px-4 py-3 sm:px-6"
        aria-label="Admin sections"
      >
        {TABS.map((t) => {
          const disabled = t.id === "editor" && editorDisabled;
          const isOn = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onChange(t.id)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                isOn ? adminTabActive : adminTabIdle
              } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
