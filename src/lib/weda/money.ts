// Moneda de la lista de regalos (GIFT-10 v2, BR-21; spec en specs/GIFT-10-moneda-de-la-lista/).
// La pareja muestra su lista en pesos, en dólares o en las dos. Cada regalo tiene un precio en cada moneda: el catálogo lo trae fijo;
// en los propios, Weda sugiere el de la otra moneda a una cotización fija ($ 1.500 por dólar) y la pareja lo puede cambiar (D5).
// Los importes de monedas distintas nunca se suman. Todos los montos son enteros y redondos (D6).

export type Currency = 'ARS' | 'USD';
export const CURRENCIES: Currency[] = ['ARS', 'USD'];
export const isCurrency = (v: unknown): v is Currency => v === 'ARS' || v === 'USD';
export const CURRENCY_LABEL: Record<Currency, string> = { ARS: 'Pesos', USD: 'Dólares' };
/** Símbolo del círculo del selector (como la referencia de la dueña). */
export const CURRENCY_SYMBOL: Record<Currency, string> = { ARS: 'AR$', USD: 'US$' };
/** «en pesos» / «en dólares», para los textos de los campos y los avisos. */
export const CURRENCY_IN: Record<Currency, string> = { ARS: 'en pesos', USD: 'en dólares' };

/** Cómo se muestra la lista: en pesos, en dólares o en las dos (el invitado elige). */
export type ListMode = Currency | 'both';
export const isListMode = (v: unknown): v is ListMode => isCurrency(v) || v === 'both';
export const LIST_MODE_LABEL: Record<ListMode, string> = { ARS: 'Pesos', USD: 'Dólares', both: 'Pesos y dólares' };

/** Mínimo y máximo de un regalo, de un aporte libre y de cada renglón de un aporte, según la moneda (D11). */
export const LIMITS: Record<Currency, { min: number; max: number }> = {
  ARS: { min: 1000, max: 100_000_000 },
  USD: { min: 10, max: 100_000 },
};

/** Cotización fija para SUGERIR el monto en la otra moneda (D5). No es una cotización de mercado ni convierte aportes. */
export const SUGGEST_RATE = 1500;
/** Dólares sugeridos para un monto en pesos: a la decena, para arriba (D6). */
export const usdFrom = (ars: number): number => Math.max(LIMITS.USD.min, Math.ceil(ars / SUGGEST_RATE / 10) * 10);
/** Pesos sugeridos para un monto en dólares: al millar, para arriba (D6). */
export const arsFrom = (usd: number): number => Math.max(LIMITS.ARS.min, Math.ceil((usd * SUGGEST_RATE) / 1000) * 1000);

/** Precio de un regalo en una moneda. `amount` es siempre pesos; sin `amountUsd` guardado (listas anteriores), se sugiere. */
export const priceIn = (g: { amount: number; amountUsd?: number | undefined }, c: Currency): number => (c === 'USD' ? (g.amountUsd ?? usdFrom(g.amount)) : g.amount);

const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
/** «$ 250.000» en pesos (idéntico a como se mostraba antes) y «US$ 250» en dólares. Siempre enteros; el espacio no se corta. */
export function formatMoney(n: number, currency: Currency = 'ARS'): string {
  return currency === 'USD' ? `US$\u00a0${num.format(Math.round(n))}` : ars.format(Math.round(n));
}

/** Modo de una lista (sin dato = pesos). */
export const listMode = (gifts: { currency?: ListMode | undefined } | undefined): ListMode => gifts?.currency ?? 'ARS';
/** Monedas que muestra una lista, en orden: pesos primero (el invitado empieza viendo pesos, D10). */
export const shownCurrencies = (mode: ListMode): Currency[] => (mode === 'both' ? ['ARS', 'USD'] : [mode]);
/** La pareja ya eligió la moneda: la guardó, o su lista ya tenía regalos de antes (esas quedan en pesos sin preguntar, CA-1). */
export const currencyChosen = (gifts: { currency?: ListMode | undefined; items: unknown[] }): boolean => gifts.currency !== undefined || gifts.items.length > 0;
