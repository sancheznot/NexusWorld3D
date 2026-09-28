"use client";
import React from 'react';
import type { SceneEntityV0_1 } from '@nexusworld3d/content-schema';
import SceneNumberInput from './SceneNumberInput';
export default function SceneInteractionInspector({ entity, onChange }: { entity: SceneEntityV0_1; onChange: (type: string, patch: Record<string, unknown>) => void }) {
  const trigger = entity.components.find(c => c.type === 'nexus:triggerSphere');
  const portal = entity.components.find(c => c.type === 'nexus:portal');
  if (!trigger) return null;
  return <fieldset className="space-y-2"><legend className="text-cyan-200">Interacción · tecla E</legend>
    <label className="block">Etiqueta<input className="mt-1 w-full rounded bg-slate-900 p-2" maxLength={120}
      value={String(trigger.props.label ?? '')} onChange={event => onChange(trigger.type, { label: event.target.value || undefined })} /></label>
    <SceneNumberInput label="Radio local" value={Number(trigger.props.radius)} min={0.1} max={100} onCommit={radius => onChange(trigger.type, { radius })} />
    {portal ? <><p className="text-slate-400">Destino mundial, dentro del mismo mapa. No hereda la transformación del grupo.</p>
      {['X', 'Y', 'Z'].map((label, axis) => <SceneNumberInput key={axis} label={`Destino ${label}`} value={(portal.props.targetPosition as number[])[axis]}
        min={axis === 1 ? 1.05 : -1e6} max={1e6} onCommit={value => {
          const targetPosition = [...portal.props.targetPosition as number[]]; targetPosition[axis] = value; onChange(portal.type, { targetPosition });
        }} />)}
      <SceneNumberInput label="Orientación destino (grados)" min={-360} max={360} value={Number(portal.props.yaw ?? 0) * 180 / Math.PI}
        onCommit={value => onChange(portal.type, { yaw: value * Math.PI / 180 })} /></> : null}
  </fieldset>;
}
