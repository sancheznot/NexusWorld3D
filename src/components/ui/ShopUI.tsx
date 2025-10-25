'use client';

import { useEffect, useState } from 'react';
import shopClient from '@/lib/colyseus/ShopClient';
import { useUIStore } from '@/store/uiStore';
import { economy } from '@/lib/services/economy';

type ShopSummary = { shops: { id: string; name: string }[] };
type ShopData = { id: string; name: string; items: { itemId: string; name: string; price: number; stock: number; thumb?: string; icon?: string }[] };

export default function ShopUI() {
  const { isShopOpen, toggleShop } = useUIStore();
  const [list, setList] = useState<ShopSummary | null>(null);
  const [shop, setShop] = useState<ShopData | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onList = (data: unknown) => setList(data as ShopSummary);
    const onData = (data: unknown) => setShop(data as ShopData);
    const onError = (data: unknown) => setMessage((data as { message: string }).message);
    const onSuccess = (data: unknown) => setMessage(`Compra exitosa`);
    shopClient.on('shop:list', onList);
    shopClient.on('shop:data', onData);
    shopClient.on('shop:error', onError);
    shopClient.on('shop:success', onSuccess);
    shopClient.requestShops();
    return () => {
      shopClient.off('shop:list', onList);
      shopClient.off('shop:data', onData);
      shopClient.off('shop:error', onError);
      shopClient.off('shop:success', onSuccess);
    };
  }, []);

  if (!isShopOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-3xl p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-white text-xl font-bold">Tiendas</h2>
          <button onClick={toggleShop} className="text-gray-400 hover:text-white text-2xl">×</button>
        </div>
        {message && (
          <div className="mb-2 text-sm text-yellow-300">{message}</div>
        )}
        {!shop ? (
          <div className="grid grid-cols-2 gap-2">
            {list?.shops.map(s => (
              <button key={s.id} onClick={() => shopClient.openShop(s.id)} className="bg-gray-800 hover:bg-gray-700 text-white rounded p-3 text-left">
                {s.name}
              </button>
            ))}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-white text-lg font-semibold">{shop.name}</div>
              <button onClick={() => setShop(null)} className="text-sm text-gray-300 hover:text-white">← Volver</button>
            </div>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {shop.items.map(it => (
                <div key={it.itemId} className="flex items-center justify-between bg-gray-800 rounded p-2">
                  <div className="flex items-center gap-3">
                    {it.thumb ? <img src={it.thumb} alt={it.name} className="w-10 h-10 object-contain"/> : <span className="text-2xl">{it.icon ?? '📦'}</span>}
                    <div>
                      <div className="text-white font-medium">{it.name}</div>
                      <div className="text-xs text-gray-400">Stock: {it.stock < 0 ? '∞' : it.stock}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-yellow-300 font-mono">{economy.format(it.price)}</div>
                    <button onClick={() => shopClient.buy(shop.id, it.itemId, 1)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded">Comprar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


