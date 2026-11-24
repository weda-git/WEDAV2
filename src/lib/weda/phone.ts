// WhatsApp de la pareja y de quien regala (GIFT-15 / ONB-06, D6; spec en specs/GIFT-15-whatsapp-y-agradecer/).
// Se pide con el código del país adelante (por defecto +54) y se guarda en formato internacional, solo números (5491155554444):
// es lo que usa el enlace de WhatsApp (wa.me). No se verifica que el número exista.

export type Country = { code: string; label: string };
/** Países del selector: Argentina primero (el por defecto) y los vecinos y destinos más comunes. */
export const COUNTRIES: Country[] = [
  { code: '54', label: 'Argentina (+54)' }, { code: '598', label: 'Uruguay (+598)' }, { code: '56', label: 'Chile (+56)' },
  { code: '55', label: 'Brasil (+55)' }, { code: '595', label: 'Paraguay (+595)' }, { code: '591', label: 'Bolivia (+591)' },
  { code: '51', label: 'Perú (+51)' }, { code: '57', label: 'Colombia (+57)' }, { code: '52', label: 'México (+52)' },
  { code: '1', label: 'Estados Unidos (+1)' }, { code: '34', label: 'España (+34)' }, { code: '39', label: 'Italia (+39)' },
];
export const DEFAULT_COUNTRY = '54';

const digits = (v: string) => v.replace(/\D/g, '');

/**
 * Número completo, solo dígitos. En Argentina se saca el 0 del código de área y el 15 de los celulares escritos a la antigua
 * (011 15 5555-4444), y se agrega el 9 de celular si falta (D6). null si no parece un número.
 */
export function normalizePhone(country: string, raw: string): string | null {
  let n = digits(raw);
  if (raw.trim().startsWith('+')) return n.length >= 8 && n.length <= 15 ? n : null; // escribió el número completo con su código
  if (country === '54') {
    if (n.startsWith('54')) n = n.slice(2);
    n = n.replace(/^0/, '');
    if (n.startsWith('9')) n = n.slice(1);
    // Área (2 a 4 dígitos) + «15» + número: 11 15 5555 4444 → 11 5555 4444.
    const m = /^(\d{2,4})15(\d{6,8})$/.exec(n);
    if (m && m[1]!.length + m[2]!.length === 10) n = m[1]! + m[2]!;
    return n.length === 10 ? `549${n}` : null;
  }
  n = n.replace(/^0/, '');
  const full = country + n;
  return n.length >= 6 && full.length <= 15 ? full : null;
}

export const PHONE_ERROR = 'Revisá el número: código de área y número, sin el 0 ni el 15.';
export function validatePhone(country: string, raw: string): string | null {
  if (!raw.trim()) return 'Escribí tu WhatsApp.';
  return normalizePhone(country, raw) ? null : PHONE_ERROR;
}

/** Un número guardado es válido si son 8 a 15 dígitos (lo que acepta el servidor). */
export const isStoredPhone = (v: unknown): v is string => typeof v === 'string' && /^\d{8,15}$/.test(v);

/** Separa un número guardado en país y resto, para volver a editarlo. */
export function splitPhone(stored: string): { country: string; number: string } {
  if (!stored) return { country: DEFAULT_COUNTRY, number: '' };
  if (stored.startsWith('549')) return { country: '54', number: stored.slice(3) };
  const c = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length).find(x => stored.startsWith(x.code));
  return c ? { country: c.code, number: stored.slice(c.code.length) } : { country: DEFAULT_COUNTRY, number: `+${stored}` };
}

/** «+54 9 11 5555-4444» para mostrar (Argentina); el resto, «+598 99123456». */
export function formatPhone(p: string): string {
  if (/^549\d{10}$/.test(p)) { const n = p.slice(3); const area = n.startsWith('11') ? 2 : 3; return `+54 9 ${n.slice(0, area)} ${n.slice(area, -4)}-${n.slice(-4)}`; }
  const c = COUNTRIES.find(x => p.startsWith(x.code));
  return c ? `+${c.code} ${p.slice(c.code.length)}` : `+${p}`;
}
/** Para la administración (D8): «+54 9 •••• 4444». */
export const maskPhone = (p: string): string => (p ? `+${p.slice(0, p.startsWith('549') ? 3 : 2)} •••• ${p.slice(-4)}` : '');

/** Enlace que abre WhatsApp con ese chat y el mensaje ya escrito (la pareja lo puede cambiar antes de mandarlo). */
export const waLink = (phone: string, text: string): string => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

/** Lista natural: «A», «A y B», «A, B y C». */
const listOf = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`);
/** Mensaje de agradecimiento (D5): «¡Hola, Nora! Muchas gracias por regalarnos Excursión en barco. Nos hizo muy felices. Ana y Leo». */
export function thankMessage(giver: string, gifts: string[], couple: string, group = ''): string {
  const first = giver.trim().split(/\s+/)[0] || '';
  const what = gifts.length ? `por regalarnos ${listOf(gifts)}` : 'por el regalo';
  // Regalo grupal: se agradece al grupo («Muchas gracias a vos y a Los primos Díaz por…»).
  const to = group.trim() ? `a vos y a ${group.trim()} ` : '';
  return `¡Hola${first ? `, ${first}` : ''}! Muchas gracias ${to}${what}. Nos hizo muy felices. ${couple}`.trim();
}
