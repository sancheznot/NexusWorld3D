import { createDinero, type Dinero } from "@dinero.js/core";
import { calculator } from "@dinero.js/calculator-number";
import currencyjs from "currency.js";
import { GAME_CONFIG } from "@/constants/game";

const dinero = createDinero<number>({ calculator });

// Define custom in-game currency for Dinero (defaults to 2 decimals)
export const HBC = {
  code: GAME_CONFIG.currency.code,
  base: 10,
  exponent: 2,
} as const;

export type Money = Dinero<number>;

export function createMoneyFromMinor(minorAmount: number): Money {
  return dinero({ amount: minorAmount, currency: HBC });
}

export function createMoneyFromMajor(majorAmount: number): Money {
  const minor = toMinor(majorAmount);
  return createMoneyFromMinor(minor);
}

export function toMinor(majorAmount: number): number {
  // Avoid float drift using currency.js
  return currencyjs(majorAmount).multiply(100).intValue;
}

export function toMajor(minorAmount: number): number {
  return currencyjs(minorAmount).divide(100).value;
}

export function formatMinor(
  minorAmount: number,
  opts?: { withCode?: boolean; withSymbol?: boolean }
): string {
  const withSymbol = opts?.withSymbol ?? true;
  const withCode = opts?.withCode ?? false;
  const major = toMajor(minorAmount);
  const formatted = currencyjs(major, {
    symbol: withSymbol ? GAME_CONFIG.currency.symbol : "",
    precision: 2,
  }).format();
  return withCode ? `${formatted} ${GAME_CONFIG.currency.code}` : formatted;
}

export function formatMajor(
  majorAmount: number,
  opts?: { withCode?: boolean; withSymbol?: boolean }
): string {
  const withSymbol = opts?.withSymbol ?? true;
  const withCode = opts?.withCode ?? false;
  const formatted = currencyjs(majorAmount, {
    symbol: withSymbol ? GAME_CONFIG.currency.symbol : "",
    precision: 2,
  }).format();
  return withCode ? `${formatted} ${GAME_CONFIG.currency.code}` : formatted;
}

export function parseToMinor(input: string): number {
  // currency.js handles symbols and separators
  const major = currencyjs(input).value;
  return toMinor(major);
}

export function addMinor(a: number, b: number): number {
  return Math.floor(a + b);
}

export function subMinor(a: number, b: number): number {
  const res = a - b;
  return Math.max(0, Math.floor(res));
}

export function clampTransferMinor(minorAmount: number): number {
  const min = toMinor(GAME_CONFIG.currency.minAmount);
  const max = toMinor(GAME_CONFIG.currency.maxTransfer);
  return Math.max(min, Math.min(minorAmount, max));
}

export const money = {
  HBC,
  toMinor,
  toMajor,
  formatMinor,
  formatMajor,
  parseToMinor,
  addMinor,
  subMinor,
  clampTransferMinor,
  createMoneyFromMinor,
  createMoneyFromMajor,
};
