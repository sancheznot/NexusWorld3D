"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function normalizePickerHex(value: string): string {
  const t = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t;
  if (/^#[0-9A-Fa-f]{3}$/.test(t)) {
    const r = t[1],
      g = t[2],
      b = t[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return "#0ea5e9";
}

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  className?: string;
};

/**
 * ES: Selector nativo + hex editable (estilo admin oscuro).
 * EN: Native color picker + editable hex field.
 */
export function AdminColorField({ id, label, value, onChange, className }: Props) {
  const pickerValue = normalizePickerHex(value);

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={`${id}-hex`} className="text-slate-400">
        {label}
      </Label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={`${id}-pick`}
          type="color"
          value={pickerValue}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 shrink-0 cursor-pointer rounded-md border border-white/10 bg-slate-950 p-1 shadow-inner"
          aria-label={`${label} — selector`}
        />
        <Input
          id={`${id}-hex`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#22d3ee"
          className="min-w-0 flex-1 font-mono text-xs sm:text-sm"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
