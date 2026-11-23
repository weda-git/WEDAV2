// Moneda de la lista de regalos (GIFT-10, BR-21; spec en specs/GIFT-10-moneda-de-la-lista/). Pesos o dólares, elegida por la pareja.
// Ningún importe se convierte de una moneda a otra (BR-21): cada regalo del catálogo tiene su precio fijo en cada moneda.

export type Currency = 'ARS' | 'USD';
export const CURRENCIES: Currency[] = ['ARS', 'USD'];
export const isCurrency = (v: unknown): v is Currency => v === 'ARS' || v === 'USD';
export const CURRENCY_LABEL: Record<Currency, string> = { ARS: 'Pesos', USD: 'Dólares' };
/** «en pesos» / «en dólares», para los textos de los campos y los avisos. */
export const CURRENCY_IN: Record<Currency, string> = { ARS: 'en pesos', USD: 'en dólares' };

/** Mínimo y máximo de un regalo, de un aporte libre y de cada renglón de un aporte, según la moneda (D7). */
export const LIMITS: Record<Currency, { min: number; max: number }> = {
  ARS: { min: 1000, max: 100_000_000 },
  USD: { min: 10, max: 100_000 },
};

const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
/** «$ 250.000» en pesos (idéntico a como se mostraba antes) y «US$ 250» en dólares (D6). Siempre enteros; el espacio no se corta. */
export function formatMoney(n: number, currency: Currency = 'ARS'): string {
  return currency === 'USD' ? `US$\u00a0${num.format(Math.round(n))}` : ars.format(n);
}

/** Moneda de una lista (las listas sin moneda guardada son en pesos). */
export const listCurrency = (gifts: { currency?: Currency | undefined } | undefined): Currency => gifts?.currency ?? 'ARS';
