/**
 * ES: Los saldos de red siempre se expresan en unidades mayores, sin inferir por magnitud.
 * EN: Network balances are always major units; never infer units from magnitude.
 */
export function parseEconomyWalletAmount(data: unknown): number {
  const payload = data as { amount?: number } | number | undefined;
  let amount = 0;
  if (typeof payload === 'number') amount = payload;
  else if (payload && typeof (payload as { amount?: number }).amount === 'number') {
    amount = (payload as { amount?: number }).amount as number;
  }
  return Number.isFinite(amount) ? amount : 0;
}
