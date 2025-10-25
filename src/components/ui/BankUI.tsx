import { useEffect, useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import economyClient, { EconomyFees, LedgerEntry } from '@/lib/colyseus/EconomyClient';
import { economy } from '@/lib/services/economy';

export default function BankUI() {
  const { isBankOpen, toggleBank } = useUIStore();
  const [balance, setBalance] = useState<number>(economyClient.getBank());
  const [amount, setAmount] = useState<string>('');
  const [toUserId, setToUserId] = useState<string>('');
  const [ledger, setLedger] = useState<LedgerEntry[]>(economyClient.getLedger());
  const [error, setError] = useState<string | null>(null);
  const [limits, setLimits] = useState<{ deposit: number; withdraw: number; transfer: number; fees: EconomyFees } | null>(economyClient.getLimits());
  const [used, setUsed] = useState<{ deposit: number; withdraw: number; transfer: number } | null>(economyClient.getLimitsUsed());
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!isBankOpen) return;
    const onBal = (data: unknown) => setBalance((data as number) ?? 0);
    const onLed = (data: unknown) => {
      if (Array.isArray(data)) setLedger(data as LedgerEntry[]);
      else setLedger([]);
    };
    const onErr = (data: unknown) => setError((data as { message: string })?.message ?? '');
    economyClient.on('economy:bank', onBal);
    economyClient.on('economy:ledger', onLed);
    economyClient.on('economy:error', onErr);
    economyClient.on('economy:limits', (data) => setLimits(data as { deposit: number; withdraw: number; transfer: number; fees: EconomyFees }));
    economyClient.on('economy:limitsUsed', (data) => setUsed(data as { deposit: number; withdraw: number; transfer: number }));
    economyClient.requestState();
    return () => {
      economyClient.off('economy:bank', onBal);
      economyClient.off('economy:ledger', onLed);
      economyClient.off('economy:error', onErr);
      economyClient.off('economy:limits', (data) => setLimits(data as { deposit: number; withdraw: number; transfer: number; fees: EconomyFees }));
      economyClient.off('economy:limitsUsed', (data) => setUsed(data as { deposit: number; withdraw: number; transfer: number }));
    };
  }, [isBankOpen]);

  if (!isBankOpen) return null;

  const parsed = Number.parseFloat(amount || '0') || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-2xl font-bold">🏦 Banco</h2>
          <button onClick={toggleBank} className="px-3 py-1 bg-gray-700 text-white rounded">Cerrar</button>
        </div>

        {error && (
          <div className="mb-3 p-2 rounded bg-red-900 text-red-100 border border-red-700">{error}</div>
        )}

        <div className="bg-gray-800 rounded p-3 mb-4 flex items-center justify-between">
          <div className="text-yellow-400 text-xl font-bold">{economy.format(balance, { withSymbol: true })}</div>
          <div className="text-sm text-gray-300">Balance actual</div>
        </div>

      {limits && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-800 rounded p-2 text-gray-300 text-sm">
            <div className="font-bold text-white mb-1">Límite diario: Depósito</div>
            <div>{economy.format(limits.deposit, { withSymbol: true })}</div>
          </div>
          <div className="bg-gray-800 rounded p-2 text-gray-300 text-sm">
            <div className="font-bold text-white mb-1">Límite diario: Retiro</div>
            <div>{economy.format(limits.withdraw, { withSymbol: true })}</div>
          </div>
          <div className="bg-gray-800 rounded p-2 text-gray-300 text-sm">
            <div className="font-bold text-white mb-1">Límite diario: Transferencia</div>
            <div>{economy.format(limits.transfer, { withSymbol: true })}</div>
          </div>
        </div>
      )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-800 rounded p-3">
            <h3 className="text-white font-bold mb-2">Depositar</h3>
            <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Cantidad" className="w-full mb-2 px-2 py-1 rounded bg-gray-700 text-white outline-none" />
            <button onClick={() => { economyClient.deposit(parsed, 'manual'); setToast({ type: 'success', message: 'Depósito enviado' }); }} className="w-full bg-green-600 hover:bg-green-700 text-white rounded py-2">Depositar</button>
          </div>
          <div className="bg-gray-800 rounded p-3">
            <h3 className="text-white font-bold mb-2">Retirar</h3>
            <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Cantidad" className="w-full mb-2 px-2 py-1 rounded bg-gray-700 text-white outline-none" />
            <button onClick={() => { economyClient.withdraw(parsed, 'manual'); setToast({ type: 'success', message: 'Retiro enviado' }); }} className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded py-2">Retirar</button>
          </div>
          <div className="bg-gray-800 rounded p-3">
            <h3 className="text-white font-bold mb-2">Transferir</h3>
            <input value={toUserId} onChange={e => setToUserId(e.target.value)} placeholder="ID destino" className="w-full mb-2 px-2 py-1 rounded bg-gray-700 text-white outline-none" />
            <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Cantidad" className="w-full mb-2 px-2 py-1 rounded bg-gray-700 text-white outline-none" />
            <button onClick={() => { economyClient.transfer(toUserId, parsed, 'manual'); setToast({ type: 'success', message: 'Transferencia enviada' }); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-2">Transferir</button>
          </div>
        </div>

        <h3 className="text-white font-bold mb-2">Movimientos</h3>
        <div className="bg-gray-800 rounded p-2 divide-y divide-gray-700">
          {ledger.length === 0 && <div className="text-gray-400 p-3">Sin movimientos</div>}
          {ledger.map((e, i) => (
            <div key={i} className="flex items-center justify-between py-2 px-2 text-sm">
              <div className="text-gray-300">
                <span className="font-mono">{new Date(e.timestamp).toLocaleString()}</span>
                <span className="ml-2">{e.type}</span>
                {e.counterpartyId && <span className="ml-2 text-gray-400">({e.counterpartyId})</span>}
                {e.reason && <span className="ml-2 text-gray-500">- {e.reason}</span>}
              </div>
              <div className={e.amountMinor >= 0 ? 'text-green-400' : 'text-red-400'}>
                {e.amountMinor >= 0 ? '+' : ''}{economy.format(e.amountMinor / 100, { withSymbol: true })}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2 rounded shadow-lg ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
             onAnimationEnd={() => setTimeout(() => setToast(null), 1500)}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
