/**
 * ES: Normaliza el payload de `economy:wallet` (número o `{ amount }`, minor units).
 * EN: Normalize economy:wallet payload (number or `{ amount }`, minor units).
 */
export function parseEconomyWalletAmount(data: unknown): number {
  const payload = data as { amount?: number } | number | undefined;
  let amount = 0;
  if (typeof payload === 'number') amount = payload;
  else if (payload && typeof (payload as { amount?: number }).amount === 'number') {
    amount = (payload as { amount?: number }).amount as number;
  }
  if (amount >= 10000) amount = amount / 100;
  return Math.round(amount);
}
