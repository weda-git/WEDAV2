// GIFT-10 · Moneda de la lista (specs/GIFT-10-moneda-de-la-lista/spec.md).
import { describe, expect, it } from 'vitest';
import { gifts } from '@/lib/demo-wedding';
import { addCatalogGift, addCustomGift, emptyState, giftsMissingAmount, setListCurrency, updateGift, validateFreeAmount, validateGift } from '@/lib/weda/logic';
import { formatMoney, LIMITS, listCurrency } from '@/lib/weda/money';
import { siteFromState } from '@/lib/weda/site-model';
import { sanitize } from '@/lib/weda/store';

const nb = (s: string) => s.replace(/ /g, ' ');

describe('GIFT-10 · moneda de la lista', () => {
  it('D6: pesos como siempre y dólares como «US$ 250», sin decimales', () => {
    expect(nb(formatMoney(250000))).toBe('$ 250.000');
    expect(nb(formatMoney(250, 'USD'))).toBe('US$ 250');
    expect(nb(formatMoney(1500, 'USD'))).toBe('US$ 1.500');
  });

  it('CA-1: sin moneda guardada la lista es en pesos', () => {
    expect(listCurrency(emptyState().gifts)).toBe('ARS');
    expect(sanitize({ ...emptyState(), gifts: { ...emptyState().gifts, currency: 'EUR' } }).gifts.currency).toBeUndefined();
    expect(sanitize({ ...emptyState(), gifts: { ...emptyState().gifts, currency: 'USD' } }).gifts.currency).toBe('USD');
  });

  it('CA-2: todos los regalos del catálogo tienen precio en dólares, entero y para arriba ($ 1.500 por dólar); gift cards en decenas', () => {
    for (const g of gifts) {
      expect(Number.isInteger(g.amountUsd)).toBe(true);
      if (g.category === 'Gift cards') expect(g.amountUsd! % 10).toBe(0);
      else expect(g.amountUsd).toBe(Math.ceil(g.amount / 1500));
    }
  });

  it('CA-2, CA-3: en dólares, el catálogo entra con su precio en dólares', () => {
    const s = setListCurrency(emptyState(), 'USD');
    const r = addCatalogGift(s, 'excursion');
    expect(r.state.gifts.items[0]).toMatchObject({ catalogId: 'excursion', amount: 167 });
  });

  it('D5, CA-5: al cambiar de moneda, el catálogo toma su precio y los propios quedan sin monto (y no se muestran) hasta que se lo pongan', () => {
    let s = addCatalogGift(emptyState(), 'excursion').state;
    s = addCustomGift(s, { name: 'Auriculares', amount: 90000 });
    s = setListCurrency(s, 'USD');
    expect(s.gifts.items.find(g => g.catalogId === 'excursion')).toMatchObject({ amount: 167 });
    const own = s.gifts.items.find(g => !g.catalogId)!;
    expect(own.needsAmount).toBe(true);
    expect(giftsMissingAmount(s)).toHaveLength(1);
    expect(siteFromState({ ...s, onboarded: true, couple: { first: 'A', second: 'B' } }).gifts.map(g => g.name)).toEqual(['Excursión en barco']);
    s = updateGift(s, own.id, { amount: 60 });
    expect(giftsMissingAmount(s)).toHaveLength(0);
    // Volver a pesos: el catálogo vuelve a su precio en pesos; nada se convierte.
    s = setListCurrency(s, 'ARS');
    expect(s.gifts.items.find(g => g.catalogId === 'excursion')).toMatchObject({ amount: 250000 });
  });

  it('D7, CA-8: mínimos y máximos según la moneda', () => {
    expect(validateGift({ name: 'Algo', amount: '50', text: '' }).amount).toMatch(/mínimo/);
    expect(validateGift({ name: 'Algo', amount: '50', text: '' }, 'USD').amount).toBeUndefined();
    expect(validateGift({ name: 'Algo', amount: '5', text: '' }, 'USD').amount).toMatch(/US\$/);
    expect(validateGift({ name: 'Algo', amount: String(LIMITS.USD.max + 1), text: '' }, 'USD').amount).toMatch(/demasiado alto/);
    expect(validateFreeAmount('9', undefined, 'USD')).toMatch(/mínimo/);
    expect(validateFreeAmount('10', undefined, 'USD')).toBeNull();
  });

  it('CA-6: la página publicada lleva la moneda de la lista', () => {
    const s = { ...setListCurrency(emptyState(), 'USD'), onboarded: true, couple: { first: 'A', second: 'B' } };
    expect(siteFromState(s).currency).toBe('USD');
    expect(siteFromState({ ...emptyState(), onboarded: true, couple: { first: 'A', second: 'B' } }).currency).toBe('ARS');
  });
});
