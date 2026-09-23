import assert from 'node:assert/strict';
import test from 'node:test';
import type { Client, Room } from 'colyseus';
import { EconomyEvents } from '../resources/economy/server/EconomyEvents';
import { InventoryEvents } from '../resources/inventory/server/InventoryEvents';
import { EconomyMessages, InventoryMessages, CraftingMessages } from '../packages/protocol/src';
import { GAME_CONFIG } from '../src/constants/game';
import { money } from '../src/lib/utils/money';
import { parseEconomyWalletAmount } from '../src/lib/economy/parseWalletPayload';
import type { InventoryItem } from '../src/types/inventory.types';

function harness() {
  const handlers = new Map<string, (client: Client, data: unknown) => void>();
  const messages: { type: string; data: unknown }[] = [];
  const client = {
    sessionId: 'regression-player',
    send: (type: string, data: unknown) => messages.push({ type, data }),
  } as unknown as Client;
  const room = {
    clients: [client],
    onMessage: (type: string, fn: (client: Client, data: unknown) => void) => handlers.set(type, fn),
    broadcast: () => {},
  } as unknown as Room;
  return {
    room, client, messages,
    send(type: string, data?: unknown) {
      const handler = handlers.get(type);
      assert.ok(handler, `Handler missing: ${type}`);
      handler(client, data);
    },
    last(type: string) {
      return messages.filter((m) => m.type === type).at(-1)?.data;
    },
  };
}

function economyHarness() {
  const h = harness();
  const economy = new EconomyEvents(h.room);
  const balances = () => {
    h.send(EconomyMessages.Request);
    return {
      wallet: (h.last(EconomyMessages.Wallet) as { amount: number }).amount,
      bank: (h.last(EconomyMessages.Bank) as { amount: number }).amount,
    };
  };
  return { ...h, economy, balances };
}

test('inventory commands reject malformed payloads without mutating owned items', () => {
  const h = harness();
  const inventory = new InventoryEvents(h.room);
  inventory.createPlayerInventory(h.client.sessionId);
  const before = structuredClone(inventory.getPlayerInventory(h.client.sessionId));
  for (const type of [InventoryMessages.UseItem, InventoryMessages.EquipItem,
    InventoryMessages.UnequipItem, InventoryMessages.SwapSlots, InventoryMessages.RemoveItem,
    CraftingMessages.Execute]) {
    for (const data of [null, undefined, [], {}, 12, 'invalid']) {
      assert.doesNotThrow(() => h.send(type, data));
      assert.deepEqual(inventory.getPlayerInventory(h.client.sessionId), before);
    }
  }
});

test('money uses cents and preserves round trips', () => {
  for (const amount of [0, 0.01, 1, 1.23, 1000, 12345.67]) {
    assert.equal(money.toMinor(amount), Math.round(amount * 100));
    assert.equal(money.toMajor(money.toMinor(amount)), amount);
  }
});

test('wallet, bank and daily limits survive a new session without using inventory gold', () => {
  const h = economyHarness();
  h.economy.creditWalletMajor(h.client.sessionId, 12.34);
  h.send(EconomyMessages.Deposit, { amount: 100 });
  const snapshot = h.economy.snapshot(h.client.sessionId);
  const other = economyHarness();
  other.economy.hydrate(other.client.sessionId, JSON.stringify({ economy: snapshot }));
  assert.deepEqual(other.balances(), h.balances());
  assert.deepEqual(other.economy.snapshot(other.client.sessionId), snapshot);
  assert.throws(() => other.economy.hydrate(other.client.sessionId, { economy: { ...snapshot, walletMinor: -1 } }));
  assert.deepEqual(other.balances(), h.balances());
});

test('wallet payloads preserve large balances and cents', () => {
  for (const amount of [1.23, 9999.99, 10000, 123456.78]) {
    assert.equal(parseEconomyWalletAmount({ amount }), amount);
    assert.equal(parseEconomyWalletAmount(amount), amount);
  }
  for (const value of [null, {}, { amount: NaN }, { amount: Infinity }]) {
    assert.equal(parseEconomyWalletAmount(value), 0);
  }
});

test('server rewards and purchases still work with exact units', () => {
  const h = economyHarness();
  assert.equal(h.balances().wallet, GAME_CONFIG.currency.startingBalance);
  h.economy.creditWalletMajor(h.client.sessionId, 12.34, 'verified-reward');
  assert.equal(h.balances().wallet, GAME_CONFIG.currency.startingBalance + 12.34);
  assert.equal(h.economy.chargeWalletMajor(h.client.sessionId, 2.34), true);
  assert.equal(h.balances().wallet, GAME_CONFIG.currency.startingBalance + 10);
});

test('client cannot credit itself or submit a purchase price', () => {
  for (const type of [EconomyMessages.JobPay, EconomyMessages.Purchase]) {
    const h = economyHarness();
    const before = h.balances();
    h.send(type, { amount: 100, total: 1 });
    assert.deepEqual(h.balances(), before);
    assert.ok(h.last(EconomyMessages.Error));
  }
});

test('invalid bank requests do not change balances or throw', () => {
  for (const type of [EconomyMessages.Deposit, EconomyMessages.Withdraw, EconomyMessages.Transfer]) {
    for (const data of [null, undefined, {}, { amount: -1 }, { amount: 0 }, { amount: NaN },
      { amount: Infinity }, { amount: '10' }, { amount: GAME_CONFIG.currency.maxTransfer + 1 }]) {
      const h = economyHarness();
      const before = h.balances();
      assert.doesNotThrow(() => h.send(type, data));
      assert.deepEqual(h.balances(), before);
      assert.ok(h.last(EconomyMessages.Error));
    }
  }
});

test('bank deposit and withdrawal preserve configured fees', () => {
  const h = economyHarness();
  h.send(EconomyMessages.Deposit, { amount: 100 });
  assert.deepEqual(h.balances(), { wallet: GAME_CONFIG.currency.startingBalance - 100, bank: 100 });
  h.send(EconomyMessages.Withdraw, { amount: 10 });
  assert.deepEqual(h.balances(), { wallet: GAME_CONFIG.currency.startingBalance - 90, bank: 89.9 });
});

test('invalid internal amounts cannot corrupt a wallet', () => {
  const h = economyHarness();
  const before = h.balances();
  for (const amount of [-1, NaN, Infinity, Number.MAX_VALUE]) {
    h.economy.creditWalletMajor(h.client.sessionId, amount);
    assert.equal(h.economy.chargeWalletMajor(h.client.sessionId, amount), false);
    assert.deepEqual(h.balances(), before);
  }
  h.economy.creditWalletMajor(h.client.sessionId, 0);
  assert.equal(h.economy.chargeWalletMajor(h.client.sessionId, 0), true);
  assert.deepEqual(h.balances(), before);
});

test('internal prices are exact, not clamped to bank transfer limits', () => {
  const h = economyHarness();
  h.economy.creditWalletMajor(h.client.sessionId, 200000);
  h.economy.creditWalletMajor(h.client.sessionId, 0.01);
  assert.equal(h.balances().wallet, GAME_CONFIG.currency.startingBalance + 200000.01);
  assert.equal(h.economy.chargeWalletMajor(h.client.sessionId, 150000), true);
  assert.equal(h.balances().wallet, GAME_CONFIG.currency.startingBalance + 50000.01);
});

test('transfers credit a connected recipient and reject unknown recipients', () => {
  const h = economyHarness();
  h.room.clients.push({ sessionId: 'recipient', send: () => {} } as unknown as Client);
  h.send(EconomyMessages.Deposit, { amount: 100 });
  h.send(EconomyMessages.Transfer, { toUserId: 'recipient', amount: 10 });
  assert.equal(h.balances().bank, 89.95);
  const before = h.balances();
  h.send(EconomyMessages.Transfer, { toUserId: 'unknown', amount: 10 });
  assert.deepEqual(h.balances(), before);
  assert.ok(h.last(EconomyMessages.Error));
});

function inventoryHarness() {
  const h = harness();
  const inventory = new InventoryEvents(h.room);
  const state = inventory.createPlayerInventory(h.client.sessionId);
  const item: InventoryItem = {
    id: 'owned-item', itemId: 'wood', name: 'Wood', description: '',
    type: 'material', rarity: 'common', quantity: 5, maxStack: 99,
    weight: 1, level: 1, icon: '', isEquipped: false, slot: 0,
  };
  state.items.push(item);
  state.usedSlots = 1;
  state.currentWeight = 5;
  return { ...h, inventory, state };
}

test('client snapshots, grants and gold updates are rejected', () => {
  for (const type of [InventoryMessages.Update, InventoryMessages.AddItem, InventoryMessages.UpdateGold]) {
    const h = inventoryHarness();
    const before = structuredClone(h.state);
    h.send(type, {
      inventory: { ...before, gold: 999999, maxWeight: 999999, items: [] },
      item: { ...before.items[0], id: 'forged-item' }, amount: 999999,
    });
    assert.deepEqual(h.inventory.getPlayerInventory(h.client.sessionId), before);
    assert.ok(h.last(InventoryMessages.Error));
  }
});

test('removing an invalid quantity never adds, destroys or corrupts items', () => {
  for (const quantity of [-10, 0, 0.5, NaN, Infinity, '1', 6]) {
    const h = inventoryHarness();
    const before = structuredClone(h.state);
    h.send(InventoryMessages.RemoveItem, { itemId: 'owned-item', quantity });
    assert.deepEqual(h.inventory.getPlayerInventory(h.client.sessionId), before);
    assert.ok(h.last(InventoryMessages.Error));
  }
  const h = inventoryHarness();
  assert.doesNotThrow(() => h.send(InventoryMessages.RemoveItem, null));
});

test('valid removal consumes only the requested owned quantity', () => {
  const h = inventoryHarness();
  h.send(InventoryMessages.RemoveItem, { itemId: 'owned-item', quantity: 2 });
  const state = h.inventory.getPlayerInventory(h.client.sessionId)!;
  assert.equal(state.items[0].quantity, 3);
  assert.equal(state.currentWeight, 3);
});
