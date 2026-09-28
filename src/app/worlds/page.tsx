"use client";
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
const GameCanvas = dynamic(() => import('@/components/game/GameCanvas'), { ssr: false, loading: () => <p className="p-8 text-white">Preparando mundo…</p> });
type World = { worldId: string; name: string; description: string };
export default function WorldsPage() {
  const [worlds, setWorlds] = useState<World[]>([]), [selected, setSelected] = useState<World | null>(null);
  const [error, setError] = useState(''), [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/public/worlds', { signal: controller.signal, cache: 'no-store' }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      if (controller.signal.aborted) return;
      setWorlds(data.worlds);
      const id = new URLSearchParams(window.location.search).get('worldId');
      if (id) { const world = data.worlds.find((world: World) => world.worldId === id); if (world) setSelected(world); else setError('Este mundo no está disponible.'); }
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  if (selected) return <div className="h-screen w-full"><GameCanvas key={selected.worldId} authoredWorld={selected} /></div>;
  return <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
    <div className="mx-auto max-w-5xl"><p className="text-xs uppercase tracking-widest text-cyan-300">NexusWorld3D · mundos de la comunidad</p>
      <h1 className="mt-3 text-4xl font-semibold">Elige dónde jugar</h1>
      <p className="mt-3 text-slate-400">Escenas creadas y publicadas desde el administrador. Puedes entrar como invitado.</p>
      {loading ? <p role="status" className="mt-8">Cargando mundos…</p> : null}
      {error ? <p role="alert" className="mt-6 text-amber-200">{error} <button className="underline" onClick={() => window.location.reload()}>Reintentar</button></p> : null}
      {!loading && !worlds.length && !error ? <p className="mt-8">Todavía no hay mundos públicos.</p> : null}
      <div className="mt-10 grid gap-5 md:grid-cols-2">{worlds.map(world => <article key={world.worldId} className="rounded-xl border border-slate-700 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">{world.name}</h2><p className="my-4 text-slate-400">{world.description}</p>
        <a className="inline-block rounded bg-cyan-300 px-5 py-2 font-semibold text-slate-950" href={`/worlds?worldId=${encodeURIComponent(world.worldId)}`}>Abrir mundo</a>
      </article>)}</div><a href="/game" className="mt-10 inline-block text-cyan-200 underline">Ir al juego principal</a>
    </div>
  </main>;
}
