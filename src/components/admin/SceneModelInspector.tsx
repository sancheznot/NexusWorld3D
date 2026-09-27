"use client";

import type { SceneModelProps, SceneEntityV0_1 } from '@nexusworld3d/content-schema';
import { sceneModelAssets } from '@/lib/assets/sceneModelAssets';
import SceneNumberInput from './SceneNumberInput';
import { adminBtnSecondary, adminBtnDanger } from './admin-ui';

export default function SceneModelInspector({ model, scale, onChange }: {
  model: SceneModelProps; scale: SceneEntityV0_1['transform']['scale']; onChange: (props: SceneModelProps) => void;
}) {
  return <fieldset className="space-y-3 text-xs">
    <legend className="text-cyan-200">Modelo y colliders</legend>
    <label className="block">Asset registrado
      <select value={model.assetId} className="mt-1 w-full rounded bg-slate-900 p-2" onChange={event => {
        const asset = sceneModelAssets.find(asset => asset.id === event.target.value);
        if (asset && window.confirm('¿Cambiar el modelo y reemplazar sus colliders por los predeterminados del asset?')) {
          onChange({ ...model, assetId: asset.id, colliders: structuredClone(asset.colliders) });
        }
      }}>{sceneModelAssets.map(asset => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select>
    </label>
    <p className="text-slate-400">Cajas en coordenadas locales del modelo. Sin cajas = decoración atravesable. La selección muestra sus contornos cian.</p>
    {model.colliders.map((collider, index) => <fieldset key={index} className="space-y-2 rounded border border-white/10 p-2">
      <legend>Collider {index + 1}</legend>
      {(['size', 'offset'] as const).map(field => <div key={field}>
        <p className="text-slate-400">{field === 'size' ? 'Tamaño' : 'Desplazamiento local'}</p>
        <div className="grid grid-cols-3 gap-1">
          {(['X', 'Y', 'Z'] as const).map((axis, i) => <SceneNumberInput key={axis} label={axis} value={collider[field][i]}
            min={field === 'size' ? 0.01 : -Math.min(1000, 1000 / scale[i])} max={Math.min(1000, 1000 / scale[i])}
            onCommit={value => {
              const colliders = structuredClone(model.colliders); colliders[index][field][i] = value;
              onChange({ ...model, colliders });
            }} />)}
        </div>
      </div>)}
      <button type="button" className={adminBtnDanger} onClick={() => onChange({ ...model, colliders: model.colliders.filter((_, i) => i !== index) })}>Quitar collider</button>
    </fieldset>)}
    <button type="button" className={adminBtnSecondary} disabled={model.colliders.length >= 32}
      onClick={() => onChange({ ...model, colliders: [...model.colliders, { size: [1, 1, 1], offset: [0, 0.5, 0] }] })}>Añadir caja de colisión</button>
  </fieldset>;
}
