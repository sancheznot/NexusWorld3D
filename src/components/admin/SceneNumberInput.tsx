"use client";

import React, { useEffect, useState } from 'react';

/** Commit a complete number once, not one history entry per keystroke. */
export default function SceneNumberInput({ label, value, min, max, step = 0.1, onCommit }: {
  label: string; value: number; min?: number; max?: number; step?: number; onCommit: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => { setText(String(value)); setInvalid(false); }, [value]);
  return <label className="block text-[11px] text-slate-400">{label}
    <input type="number" step={step} min={min} max={max} value={text} aria-invalid={invalid}
      className="mt-1 w-full rounded border border-white/10 bg-slate-900 px-2 py-1 font-mono text-white focus:border-cyan-400 focus:outline-none"
      onChange={event => { setText(event.target.value); setInvalid(false); }}
      onBlur={() => {
        const number = text.trim() ? Number(text) : NaN;
        if (!Number.isFinite(number) || (min !== undefined && number < min) || (max !== undefined && number > max)) {
          setInvalid(true); setText(String(value)); return;
        }
        onCommit(number);
      }}
      onKeyDown={event => {
        if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
        if (event.key === 'Escape') { setText(String(value)); setInvalid(false); event.stopPropagation(); }
      }} />
    {invalid ? <span role="alert" className="text-amber-200">Valor fuera de rango; se conserva el anterior.</span> : null}
  </label>;
}
