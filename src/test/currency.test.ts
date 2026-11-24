// GIFT-10 v2 · Moneda de la lista: pesos, dólares o las dos (specs/GIFT-10-moneda-de-la-lista/spec.md).
import { describe, expect, it } from 'vitest';
import { gifts } from '@/lib/demo-wedding';
import { addCatalogGift, addCustomGift, emptyState, setListMode, updateGift, validateFreeAmount, validateGift } from '@/lib/weda/logic';
import { arsFrom, currencyChosen, formatMoney, LIMITS, listMode, priceIn, shownCurrencies, usdFrom } from '@/lib/weda/money';
import { hasPayout, publishSummary } from '@/lib/weda/publish';
import { siteFromState } from '@/lib/weda/site-model';
import { sanitize } from '@/lib/weda/store';
import type { AppState } from '@/lib/weda/types';

const nb = (s: string) => s.replace(/\u00a0/g, ' ');
const ready = (s: AppState): AppState => ({ ...s, onboarded: true, couple: { first: 'A', second: 'B' } });

describe('GIFT-10 v2 · moneda de la lista', () => {
  it('formato: pesos como siempre y dólares como «US$ 250», sin decimales', () => {
    expect(nb(formatMoney(250000))).toBe('$ 250.000');
    expect(nb(formatMoney(250, 'USD'))).toBe('US$ 250');
    expect(nb(formatMoney(1500.4, 'USD'))).toBe('US$ 1.500');
  });

  it('CA-1: una lista nueva todavía no eligió moneda; una que ya tenía regalos queda en pesos sin preguntar', () => {
    const s = emptyState();
    expect(currencyChosen(s.gifts)).toBe(false);
    expect(listMode(s.gifts)).toBe('ARS');
    expect(currencyChosen({ ...s.gifts, items: [{} as never] })).toBe(true);
    expect(currencyChosen(setListMode(s, 'both').gifts)).toBe(true);
    expect(sanitize({ ...s, gifts: { ...s.gifts, currency: 'EUR' } }).gifts.currency).toBeUndefined();
    expect(sanitize({ ...s, gifts: { ...s.gifts, currency: 'both' } }).gifts.currency).toBe('both');
  });

  it('CA-4 (D6): todo el catálogo tiene dólares enteros, múltiplos de 10, y nunca por debajo de $ 1.500 por dólar', () => {
    for (const g of gifts) {
      expect(Number.isInteger(g.amountUsd)).toBe(true);
      expect(g.amountUsd! % 10).toBe(0);
      if (g.category !== 'Gift cards') expect(g.amountUsd).toBe(Math.ceil(g.amount / 1500 / 10) * 10);
    }
    expect(gifts.find(g => g.id === 'excursion')?.amountUsd).toBe(170);
    expect(gifts.find(g => g.id === 'heladera')?.amountUsd).toBe(940);
  });

  it('D5, D6: sugerencias redondas para arriba (dólares a la decena, pesos al millar)', () => {
    expect(usdFrom(250000)).toBe(170);
    expect(usdFrom(90000)).toBe(60);
    expect(usdFrom(1000)).toBe(10);
    expect(arsFrom(167)).toBe(251000);
    expect(arsFrom(170)).toBe(255000);
  });

  it('CA-2, CA-3: cada regalo tiene precio en las dos monedas y cambiar de moneda no borra ninguno', () => {
    let s = addCatalogGift(emptyState(), 'excursion').state;
    s = addCustomGift(s, { name: 'Auriculares', amount: 90000 });
    const [cat, own] = s.gifts.items;
    expect(cat).toMatchObject({ amount: 250000, amountUsd: 170 });
    expect(own).toMatchObject({ amount: 90000, amountUsd: 60 });
    for (const m of ['USD', 'both', 'ARS'] as const) {
      s = setListMode(s, m);
      expect(s.gifts.items.map(g => [g.amount, g.amountUsd])).toEqual([[250000, 170], [90000, 60]]);
    }
    s = updateGift(s, own!.id, { amountUsd: 75 });
    expect(priceIn(s.gifts.items[1]!, 'USD')).toBe(75);
    // Listas anteriores sin dólares guardados: se sugieren al leerlas.
    expect(priceIn({ amount: 300000 }, 'USD')).toBe(200);
  });

  it('CA-5: la página lleva las monedas de la lista y los dos precios de cada regalo', () => {
    let s = addCatalogGift(emptyState(), 'excursion').state;
    expect(siteFromState(ready(s)).currencies).toEqual(['ARS']);
    s = setListMode(s, 'both');
    const site = siteFromState(ready(s));
    expect(site.currencies).toEqual(['ARS', 'USD']);
    expect(site.gifts[0]).toMatchObject({ amount: 250000, amountUsd: 170 });
    expect(shownCurrencies('USD')).toEqual(['USD']);
  });

  it('CA-7 (D7): hace falta la cuenta de cada moneda que muestra la lista', () => {
    let s = ready(addCatalogGift(emptyState(), 'excursion').state);
    s = { ...s, gifts: { ...s.gifts, alias: 'ana.leo.pesos' } };
    expect(hasPayout(s)).toBe(true);
    s = setListMode(s, 'both');
    expect(hasPayout(s)).toBe(false);
    expect(publishSummary(s, 'regalos').todo.map(t => t.text)).toContain('Configurá tu cuenta en dólares (alias).');
    s = { ...s, gifts: { ...s.gifts, usd: { alias: 'ana.leo.usd', bank: '', cbu: '' } } };
    expect(hasPayout(s)).toBe(true);
    s = setListMode({ ...s, gifts: { ...s.gifts, alias: '' } }, 'USD');
    expect(hasPayout(s)).toBe(true);
  });

  it('D11: mínimos y máximos según la moneda', () => {
    expect(validateGift({ name: 'Algo', amount: '50', text: '' }).amount).toMatch(/mínimo/);
    expect(validateGift({ name: 'Algo', amount: '50', text: '' }, 'USD').amount).toBeUndefined();
    expect(validateGift({ name: 'Algo', amount: '5', text: '' }, 'USD').amount).toMatch(/US\$/);
    expect(validateGift({ name: 'Algo', amount: String(LIMITS.USD.max + 1), text: '' }, 'USD').amount).toMatch(/demasiado alto/);
    expect(validateFreeAmount('9', undefined, 'USD')).toMatch(/mínimo/);
    expect(validateFreeAmount('10', undefined, 'USD')).toBeNull();
  });
});
