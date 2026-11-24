// Lista de regalos pública. Es la MISMA página para /ejemplo/regalos y para la lista de cada pareja: todo viene de useSite().
import { FREE_GIFT_ID, freeGift, isEmail, isFreeGift, parseAmount, validateFreeAmount } from '@/lib/weda/logic';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  ArrowRight, Banknote, BedDouble, BedSingle, Check, ChefHat, Coffee, Compass, Copy, Dog, House, Lamp,
  Palette, Plane, Sofa, Sprout, Ticket, Trees, Upload, Utensils, Wine, X, type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRsvp } from '@/components/rsvp-dialog';
import { SiteCover } from './site-cover';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { Category, Gift, IconKey } from '@/lib/demo-wedding';
import { CURRENCY_LABEL, CURRENCY_SYMBOL, formatMoney, priceIn, type Currency } from '@/lib/weda/money';
import { useSite, useSiteActions, type GiftSubmission, type Giver } from '@/lib/weda/site-model';
import { MARKETING_CONSENT_TEXT } from '@/lib/weda/consent';
import { COUNTRIES, DEFAULT_COUNTRY, normalizePhone, PHONE_ERROR } from '@/lib/weda/phone';
import '@/gift-card.css';

/** Cortes del filtro por monto según la moneda (GIFT-10): en pesos 200.000 y 500.000; en dólares 150 y 350. */
const BANDS = { ARS: [200000, 500000], USD: [150, 350] } as const;

/** Monedas de la lista publicada (GIFT-10 v2). Las páginas publicadas antes no lo dicen: son pesos. */
const siteCurrencies = (c: Currency[] | undefined): Currency[] => (c?.length ? c : ['ARS']);
/** Moneda en que mira la lista ESTE invitado: con «Las dos» la elige él (D3) y empieza en pesos (D10). */
const MoneyCtx = createContext<Currency | null>(null);
/** `money`: «$ 250.000» o «US$ 250». `price`: el precio de un regalo en esa moneda (el aporte libre es el monto que escribió el invitado). */
function useMoney() {
  const site = useSite();
  const cur = useContext(MoneyCtx) ?? siteCurrencies(site.currencies)[0]!;
  return { cur, money: (n: number) => formatMoney(n, cur), price: (g: Gift) => (isFreeGift(g) ? g.amount : priceIn(g, cur)) };
}

/** Moneda de la lista, junto a los filtros (2026-11-24, pedido de la dueña): dos botones chicos «AR$» y «US$», como un filtro más. Solo con «Las dos». */
function CurrencyMini({ cur, onChange }: { cur: Currency; onChange: (c: Currency) => void }) {
  return (
    <div className="rg-curmini" role="radiogroup" aria-label="Moneda de los precios">
      {(['ARS', 'USD'] as Currency[]).map(c => (
        <button key={c} type="button" role="radio" aria-checked={cur === c} aria-label={CURRENCY_LABEL[c]} className={cur === c ? 'on' : ''} onClick={() => onChange(c)}>{CURRENCY_SYMBOL[c]}</button>
      ))}
    </div>
  );
}

/** Al entrar a una lista en pesos y dólares, el invitado elige cómo ver los precios. Diseño de la referencia de la dueña (2026-11-24):
 *  título en mayúsculas con la X a la derecha, una línea, las dos monedas en fila (círculo y sigla; la elegida, oscura) y la moneda actual.
 *  Se pregunta una vez por lista en esta pestaña; después se cambia con `CurrencyMini`. Cerrar sin elegir deja la actual (pesos, D10). */
const CURRENCY_NAME: Record<Currency, string> = { ARS: 'Pesos', USD: 'Dólares' };
function CurrencyAsk({ open, cur, onPick }: { open: boolean; cur: Currency; onPick: (c: Currency) => void }) {
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onPick(cur); }}>
      <DialogContent className="rg-dialog rg-curask" onOpenAutoFocus={e => { e.preventDefault(); (e.currentTarget as HTMLElement | null)?.focus(); }}>
        <div className="rg-curask-head"><DialogTitle>Elegí la moneda</DialogTitle></div>
        <DialogDescription className="dm-sr">Elegí en qué moneda ver los precios. La podés cambiar después, junto a los filtros.</DialogDescription>
        <div className="rg-curask-opts" role="radiogroup" aria-label="Moneda">
          {(['ARS', 'USD'] as Currency[]).map(c => (
            <button key={c} type="button" role="radio" aria-checked={cur === c} aria-label={CURRENCY_NAME[c]} className={`rg-curask-opt${cur === c ? ' is-on' : ''}`} onClick={() => onPick(c)}>
              <span className="rg-curask-coin" aria-hidden="true">{CURRENCY_SYMBOL[c]}</span>
              <span className="rg-curask-code" aria-hidden="true">{c}</span>
            </button>
          ))}
        </div>
        <p className="rg-curask-now">Moneda actual: <strong>{CURRENCY_NAME[cur]}</strong></p>
      </DialogContent>
    </Dialog>
  );
}

const icons: Record<IconKey, LucideIcon> = {
  utensils: Utensils, bed: BedDouble, chef: ChefHat, plane: Plane, sofa: Sofa, lamp: Lamp, wine: Wine,
  palette: Palette, ticket: Ticket, sprout: Sprout, dog: Dog, trees: Trees, coffee: Coffee, sheets: BedSingle, compass: Compass, home: House,
};

/* Misma tarjeta que la escena "Lista de regalos" de la landing: foto cuadrada, monto sobre la foto,
   nombre y un botón. */
/* Los regalos son simbólicos (BR-19): ningún aporte anterior, propio o ajeno, cambia su disponibilidad. Sin «Ya elegido», «Agotado» ni stock. */
function GiftCard({ gift, inCart, onPick }: { gift: Gift; inCart: boolean; onPick: (g: Gift) => void }) {
  const { money, price } = useMoney();
  const Icon = icons[gift.icon];
  return (
    <article className={`rg-card gc${inCart ? ' in-cart' : ''}`}>
      {/* Tocar la foto también regala (pedido de la dueña, 2026-11-20). Con teclado se usa el botón «Regalar», que hace lo mismo. */}
      <div className={`rg-photo gc-photo is-pickable${gift.fit ? ' is-contain' : ''}${gift.fit === 'white' ? ' is-white' : ''}`} style={gift.fit && gift.image ? ({ '--bg': `url(${gift.image})` } as React.CSSProperties) : undefined} onClick={() => onPick(gift)}>
        {gift.image
          ? <img src={gift.image} alt="" loading="lazy" style={gift.pos || gift.zoom ? { objectPosition: gift.pos, ...(gift.zoom ? { transform: `scale(${gift.zoom.scale})`, transformOrigin: gift.zoom.origin } : {}) } : undefined} />
          : <span className="rg-icon" aria-hidden="true"><Icon size={34} strokeWidth={1.2} /></span>}
        <span className="gc-price">{money(price(gift))}</span>
      </div>
      <h3 className="gc-name" title={gift.name}>{gift.name}</h3>
      <button type="button" className="rg-btn gc-action" onClick={() => onPick(gift)}>
        {inCart ? <><Check size={14} aria-hidden="true" />En tu regalo</> : 'Regalar'}
      </button>
    </article>
  );
}

/* Aporte libre (GIFT-09): primera tarjeta de la grilla, con la misma forma que las demás. El invitado escribe cuánto quiere regalar
   (con el mínimo que fijó la pareja) y lo suma a su regalo. Si ya está en el carrito, el monto se puede cambiar desde acá. */
function FreeCard({ min, current, onAdd }: { min: number; current: number | null; onAdd: (amount: number) => void }) {
  const { money, cur } = useMoney();
  const [raw, setRaw] = useState(current ? String(current) : '');
  const [error, setError] = useState<string | null>(null);
  const add = () => {
    // El mínimo que fijó la pareja es en pesos; en dólares rige el de la moneda (GIFT-10 v2).
    const err = validateFreeAmount(raw, cur === 'ARS' ? min : undefined, cur);
    setError(err);
    if (!err) onAdd(parseAmount(raw));
  };
  return (
    <article className={`rg-card rg-free gc gc-free${current ? ' in-cart' : ''}`}>
      <div className="rg-photo rg-free-box gc-photo">
        <span className="rg-icon" aria-hidden="true"><Banknote size={30} strokeWidth={1.2} /></span>
        <label htmlFor={FREE_GIFT_ID}>Elegí cuánto querés regalar</label>
        <span className="rg-free-input"><span aria-hidden="true">{cur === 'USD' ? 'US$' : '$'}</span><input id={FREE_GIFT_ID} type="text" inputMode="numeric" autoComplete="off" placeholder="Monto" value={raw} onChange={e => { setRaw(e.target.value); setError(null); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} aria-invalid={!!error} aria-describedby={error ? 'rg-free-error' : min > 1000 ? 'rg-free-min' : undefined} /></span>
        {error ? <p className="rg-free-error" id="rg-free-error" role="alert">{error}</p> : cur === 'ARS' && min > 1000 && <p className="rg-free-min" id="rg-free-min">Mínimo {money(min)}</p>}
      </div>
      <h3 className="gc-name">Aporte libre</h3>
      <button type="button" className="rg-btn gc-action" onClick={add}>
        {current ? <><Check size={14} aria-hidden="true" />Cambiar monto</> : 'Agregar'}
      </button>
    </article>
  );
}

/** Un dato para transferir (alias o CBU), destacado y con su botón de copiar. */
function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); } catch { /* sin portapapeles: el dato igual queda a la vista */ }
    setCopied(true); window.setTimeout(() => setCopied(false), 2200);
  };
  return (
    <div className="rg-copy">
      <dt>{label}</dt>
      <dd><code>{value}</code></dd>
      <button type="button" onClick={() => void copy()} aria-label={copied ? `${label} copiado` : `Copiar ${label.toLowerCase() === 'cbu' ? 'el CBU' : 'el alias'}`}>
        {copied ? <><Check size={14} aria-hidden="true" /><span>Copiado</span></> : <><Copy size={14} aria-hidden="true" /><span>Copiar</span></>}
      </button>
    </div>
  );
}

function Thumb({ gift }: { gift: Gift }) {
  if (isFreeGift(gift)) return <span className="rg-thumb" aria-hidden="true"><Banknote size={22} strokeWidth={1.3} /></span>;
  const Icon = icons[gift.icon];
  return <span className="rg-thumb" aria-hidden="true">{gift.image ? <img src={gift.image} alt="" style={gift.pos ? { objectPosition: gift.pos } : undefined} /> : <Icon size={22} strokeWidth={1.3} />}</span>;
}

/* Pop-up de varios regalos: tu regalo (lista, quitar, total) → cómo pagar → alias → nombre, apellido y comprobante → Enviar → agradecimiento.
   «Agregar otro regalo» vuelve a la lista sin perder lo elegido. */
type DialogView = 'cart' | 'pay';
function GiftDialog({ open, gifts: items, onClose, onFinished, onRemove, onChangeFree, onSent, returnFocus }: { open: boolean; gifts: Gift[]; onClose: () => void; onFinished: () => void; onRemove: (g: Gift) => void; onChangeFree: () => void; onSent: (gs: Gift[], giver: Giver, extra: GiftSubmission) => void | Promise<void>; returnFocus: { current: HTMLElement | null } }) {
  const { money, cur, price } = useMoney();
  const [view, setView] = useState<DialogView>('cart');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  // GIFT-15 (D3): WhatsApp obligatorio, con el país adelante (+54 por defecto).
  const [phone, setPhone] = useState({ country: DEFAULT_COUNTRY, number: '' });
  const phoneFull = normalizePhone(phone.country, phone.number);
  const [message, setMessage] = useState('');
  const [optIn, setOptIn] = useState(false);
  const { remote } = useSiteActions();
  const [proof, setProof] = useState<File | null>(null);
  const [how, setHow] = useState<'alias' | 'tarjeta'>('alias');
  const site = useSite();
  // La cuenta de la moneda que eligió el invitado (GIFT-10 v2, D4).
  const account = cur === 'USD' ? (site.usd ?? { alias: '', bank: '', cbu: '' }) : { alias: site.alias, bank: site.bank, cbu: site.cbu };
  const alias = account.alias;
  // Lo enviado se guarda aparte: al enviar, el carrito se vacía pero el agradecimiento sigue mostrando esos regalos.
  const [sent, setSent] = useState<{ first: string; gifts: Gift[]; total: number } | null>(null);
  const total = items.reduce((n, g) => n + price(g), 0);
  const reset = () => { attempt.current = null; setSendError(null); setView('cart'); setName(''); setSurname(''); setEmail(''); setPhone({ country: DEFAULT_COUNTRY, number: '' }); setMessage(''); setOptIn(false); setProof(null); setHow('alias'); setSent(null); };
  // Para poder enviar: nombre, apellido, correo (obligatorio: constancia del regalo y contacto de la pareja) y, si transfiere por alias, el comprobante.
  const cardSelected = site.acceptCard && how === 'tarjeta';
  const noAlias = !cardSelected && !alias;
  const blocked = cardSelected || noAlias;
  const missing = blocked ? [] : [
    name.trim().length < 2 && 'nombre',
    surname.trim().length < 2 && 'apellido',
    !isEmail(email) && 'tu correo',
    !phoneFull && 'tu WhatsApp',
    how === 'alias' && !proof && 'comprobante',
  ].filter(Boolean) as string[];
  // Al cerrar el agradecimiento, la página puede invitar a confirmar la asistencia (ver GiftsPage).
  const close = () => { const finished = !!sent; onClose(); window.setTimeout(() => { reset(); if (finished) onFinished(); }, 200); };
  const keepShopping = () => { onClose(); window.setTimeout(() => setView('cart'), 200); };
  // La clave de reintento se crea una vez por envío y se reutiliza si falla la red: el servidor no duplica el aporte.
  const attempt = useRef<{ key: string; token: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blocked || missing.length || items.length === 0 || sending) return;
    attempt.current ??= { key: crypto.randomUUID(), token: `${crypto.randomUUID()}${crypto.randomUUID()}` };
    setSending(true); setSendError(null);
    try {
      await onSent(items, { name: `${name.trim()} ${surname.trim()}`, message: message.trim(), how, email: email.trim().toLowerCase(), phone: phoneFull ?? '', marketingOptIn: optIn }, { proof, attempt: attempt.current, currency: cur });
    } catch (err) {
      setSending(false);
      setSendError(err instanceof Error && err.message ? err.message : 'No pudimos enviar tu regalo. Revisá tu conexión y probá de nuevo.');
      return;
    }
    setSending(false);
    attempt.current = null;
    setSent({ first: name.trim().split(/\s+/)[0] ?? name.trim(), gifts: items, total });
  };
  const remove = (g: Gift) => { onRemove(g); if (items.length <= 1) { onClose(); window.setTimeout(() => setView('cart'), 200); } };
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) close(); }}>
      <DialogContent className={`rg-dialog${!sent && view === 'pay' ? ' is-wide' : ''}`} onOpenAutoFocus={e => { e.preventDefault(); (e.currentTarget as HTMLElement).focus(); }} onCloseAutoFocus={e => { e.preventDefault(); returnFocus.current?.focus(); }}>
        {sent ? (
          <div className="rg-thanks">
            <span className="rg-check" aria-hidden="true"><Check size={22} strokeWidth={1.8} /></span>
            <DialogTitle>¡Gracias, {sent.first}!</DialogTitle>
            <DialogDescription>Le regalaste <strong>{money(sent.total)}</strong> a {site.names.replace(/\s*&\s*/, ' y ')}.</DialogDescription>
            {sent.gifts.length > 1 && <ul className="rg-sent">{sent.gifts.map(g => <li key={g.id}>{g.name}<span>{money(price(g))}</span></li>)}</ul>}
            <button type="button" className="dm-solid" onClick={close}>Listo</button>
          </div>
        ) : view === 'cart' ? (
          <div className="rg-form rg-cart">
            <header className="rg-head">
              <div>
                <p className="rg-kicker">Regalo para {site.names}</p>
                <DialogTitle>Tu regalo</DialogTitle>
              </div>
            </header>
            <ul className="rg-cart-list">
              {items.map(g => (
                <li key={g.id} className="rg-cart-item">
                  <Thumb gift={g} />
                  <div className="rg-cart-info">
                    <strong>{g.name}</strong>
                    <span>{money(price(g))}</span>
                  </div>
                  {isFreeGift(g) && <button type="button" className="rg-remove" onClick={onChangeFree} aria-label="Cambiar el monto del aporte libre">Cambiar</button>}
                  <button type="button" className="rg-remove" onClick={() => remove(g)} aria-label={`Quitar ${g.name}`}><X size={14} aria-hidden="true" />Quitar</button>
                </li>
              ))}
            </ul>
            <p className="rg-total"><span>Total</span><strong>{money(total)}</strong></p>
            <div className="rg-actions">
              <button type="button" className="dm-solid" onClick={() => setView('pay')} disabled={items.length === 0}>Continuar</button>
              <button type="button" className="dm-ghost" onClick={keepShopping}>Agregar otro regalo</button>
            </div>
          </div>
        ) : (
          <form onSubmit={e => { void submit(e); }} noValidate className="rg-form rg-pay">
            <header className="rg-head">
              <div>
                <p className="rg-kicker">Regalo para {site.names}</p>
                <DialogTitle>Tu regalo</DialogTitle>
              </div>
            </header>

            {site.acceptCard && <fieldset className="rg-field">
              <legend>¿Cómo querés pagar?</legend>
              <div className="rg-chips">
                {(['alias', 'tarjeta'] as const).map(v => (
                  <label key={v} className={`rg-chip${how === v ? ' on' : ''}`}>
                    <input type="radio" name="rg-how" value={v} checked={how === v} onChange={() => setHow(v)} />
                    <span>{v === 'alias' ? 'Alias' : 'Tarjeta'}</span>
                  </label>
                ))}
              </div>
            </fieldset>}

            <div className="rg-pay-grid">
              {/* Lo importante primero: cuánto y adónde transferir, con alias y CBU para copiar. */}
              <section className="rg-transfer" aria-label="Datos para transferir">
                <p className="rg-amount"><span>Transferí</span><strong>{money(total)}</strong></p>
                {how === 'alias' || !site.acceptCard ? (
                  alias ? (
                    <dl className="rg-bankcard">
                      <CopyRow label="Alias" value={alias} />
                      {account.cbu && <CopyRow label="CBU" value={account.cbu} />}
                      {account.bank && <div className="rg-copy"><dt>Banco</dt><dd>{account.bank}</dd></div>}
                    </dl>
                  ) : <p className="rg-note">Los novios todavía no cargaron su alias. Cuando lo hagan, vas a verlo acá.</p>
                ) : <p className="rg-note">El pago con tarjeta todavía no está disponible. Elegí «Alias» para continuar.</p>}
                <DialogDescription className="rg-help">{alias ? 'Hacé la transferencia desde tu banco y subí el comprobante.' : ''}</DialogDescription>
              </section>

              <div className="rg-fields">
                {!blocked && (
                  <div className="rg-up">
                    <input id="rg-proof" className="dm-sr" type="file" accept="image/*,application/pdf" onChange={e => setProof(e.target.files?.[0] ?? null)} />
                    <label htmlFor="rg-proof" className={`rg-file${proof ? ' has' : ''}`}>
                      {proof ? <Check size={16} aria-hidden="true" /> : <Upload size={16} aria-hidden="true" />}
                      <span>{proof ? proof.name : 'Subir comprobante (captura o PDF)'}</span>
                      {proof && <em>Cambiar</em>}
                    </label>
                  </div>
                )}

                <div className="rg-two">
                  <div className="rg-field">
                    <label htmlFor="rg-name">Nombre</label>
                    <input id="rg-name" type="text" autoComplete="given-name" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="rg-field">
                    <label htmlFor="rg-surname">Apellido</label>
                    <input id="rg-surname" type="text" autoComplete="family-name" value={surname} onChange={e => setSurname(e.target.value)} />
                  </div>
                </div>

                <div className="rg-field">
                  <label htmlFor="rg-email">Correo electrónico</label>
                  <input id="rg-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} aria-describedby="rg-email-help" />
                  <p className="rg-hint" id="rg-email-help">Para mandarte la constancia. Los novios también lo ven.</p>
                </div>

                <div className="rg-field">
                  <label htmlFor="rg-phone">WhatsApp</label>
                  <div className="rg-phone">
                    <select aria-label="Código de país" value={phone.country} onChange={e => setPhone(p => ({ ...p, country: e.target.value }))}>
                      {COUNTRIES.map(c => <option key={c.code} value={c.code} aria-label={c.label}>+{c.code}</option>)}
                    </select>
                    <input id="rg-phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder={phone.country === '54' ? '11 5555 4444' : 'Número'} value={phone.number} onChange={e => setPhone(p => ({ ...p, number: e.target.value }))} aria-describedby="rg-phone-help" />
                  </div>
                  <p className="rg-hint" id="rg-phone-help">{phone.number.trim() && !phoneFull ? PHONE_ERROR : 'Para que los novios te agradezcan. Solo lo ven ellos.'}</p>
                </div>

                <div className="rg-field">
                  <label htmlFor="rg-message">Mensaje (opcional)</label>
                  <textarea id="rg-message" rows={2} value={message} onChange={e => setMessage(e.target.value)} />
                </div>

                {/* Novedades de Weda: casilla aparte y destildada (consentimiento expreso; no es necesaria para regalar). */}
                <label className="rg-optin"><input type="checkbox" checked={optIn} onChange={e => setOptIn(e.target.checked)} /><span>{MARKETING_CONSENT_TEXT} <a href="/privacidad" target="_blank" rel="noopener noreferrer">Política de privacidad</a></span></label>

                {sendError && <p className="dm-error" role="alert">{sendError}</p>}
                <div className="rg-pay-actions">
                  <button type="button" className="dm-ghost" onClick={() => setView('cart')}>Volver</button>
                  <button type="submit" className="dm-solid rg-send" disabled={blocked || missing.length > 0 || sending} aria-busy={sending}>{sending ? 'Enviando…' : sendError ? 'Reintentar' : 'Enviar'}</button>
                </div>
                {noAlias && <p className="rg-missing" aria-live="polite">Todavía no se puede enviar: los novios no cargaron su alias.</p>}
                {missing.length > 0 && <p className="rg-missing" aria-live="polite">Para enviar falta: {missing.join(', ')}.</p>}
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function GiftsPage() {
  const site = useSite();
  const shown = siteCurrencies(site.currencies);
  const [cur, setCur] = useState<Currency>(shown[0]!);
  return <MoneyCtx.Provider value={shown.includes(cur) ? cur : shown[0]!}><GiftsList shown={shown} onCurrency={setCur} /></MoneyCtx.Provider>;
}

/** Lo que eligió el invitado para esta lista, en esta pestaña (para no volver a preguntar al recargar o volver desde la invitación). */
const curKey = (path: string) => `weda-cur:${path}`;
function readCur(path: string): Currency | null {
  try { const v = window.sessionStorage.getItem(curKey(path)); return v === 'ARS' || v === 'USD' ? v : null; } catch { return null; }
}
function saveCur(path: string, c: Currency) { try { window.sessionStorage.setItem(curKey(path), c); } catch { /* sin almacenamiento: se vuelve a preguntar */ } }

function GiftsList({ shown, onCurrency }: { shown: Currency[]; onCurrency: (c: Currency) => void }) {
  const { money, cur, price } = useMoney();
  const rsvp = useRsvp();
  const site = useSite();
  const { recordGift } = useSiteActions();
  const gifts = site.gifts;
  const categories = site.giftCategories;
  const [filter, setFilter] = useState<Category | 'Todos'>('Todos');
  const [cart, setCart] = useState<Gift[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  // Después de regalar, si el sitio tiene confirmación de asistencia y esta persona todavía no confirmó, se la invita a hacerlo.
  const [nudge, setNudge] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [range, setRange] = useState<'all' | 'asc' | 'desc' | 'low' | 'mid' | 'high'>('all');
  const [lo, hi] = BANDS[cur];
  const [query, setQuery] = useState('');
  const inRange = (g: Gift) => { const n = price(g); return range === 'all' || range === 'asc' || range === 'desc' || (range === 'low' ? n <= lo : range === 'mid' ? n > lo && n <= hi : n > hi); };
  const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const found = (g: Gift) => !query.trim() || norm(g.name).includes(norm(query.trim()));
  const visible = gifts.filter(g => (filter === 'Todos' || g.category === filter) && inRange(g) && found(g));
  if (range === 'asc') visible.sort((a, b) => price(a) - price(b));
  if (range === 'desc') visible.sort((a, b) => price(b) - price(a));
  // Al cambiar de moneda, el aporte libre que ya estaba en el carrito se quita: su monto lo escribió en la otra moneda.
  const changeCurrency = (c: Currency) => { saveCur(site.giftsPath, c); if (c === cur) return; setCart(x => x.filter(g => !isFreeGift(g))); onCurrency(c); };
  // Con «Las dos», se pregunta al entrar (2026-11-24). Se lee después de montar: el servidor no conoce lo que eligió el invitado.
  const two = shown.length > 1;
  const [ask, setAsk] = useState(false);
  useEffect(() => {
    if (!two || gifts.length === 0) return;
    const saved = readCur(site.giftsPath);
    if (saved) onCurrency(saved); else setAsk(true);
  }, [two, gifts.length, site.giftsPath, onCurrency]);
  const options: (Category | 'Todos')[] = ['Todos', ...categories];
  // El aporte libre va primero en la grilla, salvo que la persona esté buscando o filtrando por categoría.
  const showFree = site.freeAmount.enabled && filter === 'Todos' && !query.trim();
  const freeInCart = cart.find(isFreeGift);
  // Lista todavía vacía: un estado pensado para eso, sin buscador ni filtros ni «0 regalos».
  if (gifts.length === 0) return <>
    <SiteCover variant="gifts" next="#regalos" />
    <section className="ej-block ej-white rg-list" id="regalos"><div className="section-inner">
      <div className="rg-blank">
        <h2>Esta lista todavía se está armando</h2>
        <p>{site.names.replace(/\s*&\s*/, ' y ')} van a sumar sus regalos muy pronto. Mientras tanto, podés acompañarlos de otra manera.</p>
        <div className="rg-next">
          {site.blocks.rsvp && <Button variant="seed" onClick={rsvp.open}>Confirmar asistencia</Button>}
          {site.blocks.invitation && <Button variant="seedLink" asChild><Link to={site.homePath as never}><span>Volver al sitio</span><ArrowRight size={15} /></Link></Button>}
        </div>
      </div>
    </div></section>
  </>;
  return <>
    <SiteCover variant="gifts" next="#regalos" />

    <section className="ej-block ej-white rg-list" id="regalos"><div className="section-inner">
      <div className="rg-mfilters" role="group" aria-label="Buscar y filtrar regalos">
        <div className="rg-mrow">
          <label className="rg-search">
            <span className="dm-sr">Buscar un regalo</span>
            <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar un regalo" autoComplete="off" />
          </label>
          {two && <CurrencyMini cur={cur} onChange={changeCurrency} />}
        </div>
        <label className="rg-sel">
          <span className="dm-sr">Categoría</span>
          <select value={filter} onChange={e => setFilter(e.target.value as Category | 'Todos')}>
            {options.map(o => <option key={o} value={o}>{o === 'Todos' ? 'Categorías' : o}</option>)}
          </select>
        </label>
        <label className="rg-sel">
          <span className="dm-sr">Ordenar o filtrar por monto</span>
          <select value={range} onChange={e => setRange(e.target.value as typeof range)}>
            <option value="all">Cualquier monto</option>
            <option value="asc">Menor a mayor</option>
            <option value="desc">Mayor a menor</option>
            <option value="low">Hasta {money(lo)}</option>
            <option value="mid">{money(lo)} a {money(hi)}</option>
            <option value="high">Más de {money(hi)}</option>
          </select>
        </label>
      </div>
      <div className="rg-filters" role="group" aria-label="Filtrar regalos">
        {options.map(o => (
          <button type="button" key={o} className={o === filter ? 'on' : ''} aria-pressed={o === filter} onClick={() => setFilter(o)}>{o}</button>
        ))}
        <label className="rg-search rg-search-d">
          <span className="dm-sr">Buscar un regalo</span>
          <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar un regalo" autoComplete="off" />
        </label>
        {two && <CurrencyMini cur={cur} onChange={changeCurrency} />}
        <label className="rg-range">
          <span className="dm-sr">Ordenar o filtrar por monto</span>
          <select value={range} onChange={e => setRange(e.target.value as typeof range)}>
            <option value="all">Cualquier monto</option>
            <option value="asc">Menor a mayor</option>
            <option value="desc">Mayor a menor</option>
            <option value="low">Hasta {money(lo)}</option>
            <option value="mid">{money(lo)} a {money(hi)}</option>
            <option value="high">Más de {money(hi)}</option>
          </select>
        </label>
      </div>
      {visible.length === 0 && <p className="rg-empty">No encontramos regalos con esos filtros. Probá con otra búsqueda o limpiá los filtros.</p>}
      <h2 className="dm-sr">Regalos</h2>
      <div className="rg-grid">
        {showFree && <FreeCard key={freeInCart?.amount ?? 0} min={site.freeAmount.min} current={freeInCart?.amount ?? null} onAdd={amount => { returnFocus.current = document.getElementById(FREE_GIFT_ID); setCart(c => [...c.filter(x => !isFreeGift(x)), freeGift(amount)]); setCartOpen(true); }} />}
        {visible.map(g => <GiftCard key={g.id} gift={g} inCart={cart.some(c => c.id === g.id)} onPick={g => { returnFocus.current = document.activeElement as HTMLElement | null; setCart(c => c.some(x => x.id === g.id) ? c : [...c, g]); setCartOpen(true); }} />)}
      </div>
      <p className="rg-live" aria-live="polite">{visible.length} {visible.length === 1 ? 'regalo' : 'regalos'}{filter === 'Todos' ? '' : ` en ${filter}`}{range === 'all' || range === 'asc' || range === 'desc' ? '' : ' en ese rango de monto'}</p>
      <div className="rg-next">
        <p>¿Ya elegiste? Falta un último paso.</p>
        {site.blocks.rsvp && <Button variant="seed" onClick={rsvp.open}>Confirmar asistencia</Button>}
        {site.blocks.invitation && <Button variant="seedLink" asChild><Link to={site.homePath as never}><span>Volver al sitio</span><ArrowRight size={15} /></Link></Button>}
      </div>
    </div></section>

    {cart.length > 0 && !cartOpen && (
      <div className="rg-cart-bar" role="region" aria-label="Tu regalo">
        <p><strong>{cart.length === 1 ? '1 regalo' : `${cart.length} regalos`}</strong><span>{money(cart.reduce((n, g) => n + price(g), 0))}</span></p>
        <button type="button" className="dm-solid" onClick={e => { returnFocus.current = e.currentTarget; setCartOpen(true); }}>Ver mi regalo</button>
      </div>
    )}

    <GiftDialog
      open={cartOpen}
      gifts={cart}
      onClose={() => setCartOpen(false)}
      onFinished={() => { if (site.blocks.rsvp && rsvp.sentCount === 0) setNudge(true); }}
      onRemove={g => setCart(c => c.filter(x => x.id !== g.id))}
      onChangeFree={() => { setCartOpen(false); setFilter('Todos'); setQuery(''); window.setTimeout(() => { const el = document.getElementById(FREE_GIFT_ID) as HTMLInputElement | null; el?.scrollIntoView({ block: 'center' }); el?.focus(); el?.select(); }, 250); }}
      onSent={async (gs, who, extra) => { await recordGift(gs, who, extra); setCart([]); }}
      returnFocus={returnFocus}
    />

    <CurrencyAsk open={ask} cur={cur} onPick={c => { setAsk(false); changeCurrency(c); }} />

    <Dialog open={nudge} onOpenChange={setNudge}>
      <DialogContent className="rg-dialog rg-nudge">
        <DialogTitle>¿Ya confirmaste tu asistencia?</DialogTitle>
        <DialogDescription>{site.names.replace(/\s*&\s*/, ' y ')} necesitan saber si vas a estar{site.rsvp.deadline ? `, antes del ${site.rsvp.deadline}` : ''}.</DialogDescription>
        <div className="rg-pay-actions">
          <button type="button" className="dm-ghost" onClick={() => setNudge(false)}>Ahora no</button>
          <button type="button" className="dm-solid" onClick={() => { setNudge(false); window.setTimeout(rsvp.open, 200); }}>Confirmar asistencia</button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
