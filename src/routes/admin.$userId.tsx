import { useCallback, useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { api, ApiFailure, errorText } from '@/lib/weda/remote';
import { priceIn } from '@/lib/weda/money';
import { formatPhone } from '@/lib/weda/phone';
import { ACTION_LABEL, accountState, dateTime, money, planName, shortDate } from '@/components/admin/format';

export const Route = createFileRoute('/admin/$userId')({ component: AccountPage });

type Detail = {
  account: { id: string; email: string; createdAt: string; lastSignInAt: string | null; suspendedAt: string | null; suspensionNote: string; names: string };
  wedding: null | {
    slug: string | null; planId: string; date: string; currency: 'ARS' | 'USD' | 'both'; whatsapp: string;
    publication: { status: string; planId: string; publishedAt: string } | null;
    guests: { id: string; first: string; last: string; status: string; menu: string }[];
    gifts: { id: string; name: string; amount: number; amountUsd?: number; category: string }[];
    payout: { alias: string; changedAt: string | null } | null;
  };
  contributions: { id: string; currency?: 'ARS' | 'USD'; giverName: string; total: number; status: string; createdAt?: string; hasReceipt: boolean; message: string }[];
  actions: { at: string; action: string; detail: Record<string, unknown> }[];
};

const GUEST_STATUS: Record<string, string> = { yes: 'Asiste', no: 'No asiste', pending: 'Sin respuesta' };
const CONTRIB_STATUS: Record<string, string> = { pending_review: 'Por revisar', confirmed: 'Confirmado', rejected: 'Rechazado' };

/* Ficha de una cuenta (CA-3 a CA-10): datos en solo lectura y las acciones de soporte. Todo lo que se hace queda en el registro de abajo. */
function AccountPage() {
  const { userId } = Route.useParams();
  const [d, setD] = useState<Detail | null>(null);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<'suspend' | 'email' | null>(null);
  const [note, setNote] = useState('');
  const [email, setEmail] = useState('');

  const load = useCallback(async () => {
    try { setD(await api<Detail>('GET', `/api/admin/accounts/${userId}`)); }
    catch (e) { setMsg({ text: errorText(e instanceof ApiFailure ? e.code : 'network'), error: true }); }
  }, [userId]);
  useEffect(() => { void load(); }, [load]);

  const run = async (path: string, ok: string, body?: unknown) => {
    setBusy(true); setMsg(null);
    try { await api('POST', `/api/admin/accounts/${userId}/${path}`, body ?? {}); setMsg({ text: ok }); setDialog(null); await load(); return true; }
    catch (e) { setMsg({ text: errorText(e instanceof ApiFailure ? e.code : 'network'), error: true }); return false; }
    finally { setBusy(false); }
  };
  const impersonate = async () => {
    setBusy(true);
    try { await api('POST', `/api/admin/accounts/${userId}/impersonate`); window.location.assign('/panel'); }
    catch (e) { setMsg({ text: errorText(e instanceof ApiFailure ? e.code : 'network'), error: true }); setBusy(false); }
  };

  if (!d) return (
    <>
      <Link to="/admin" className="pn-link"><ArrowLeft size={16} aria-hidden="true" />Cuentas</Link>
      {msg ? <p className="adm-msg is-error" role="alert">{msg.text}</p> : <p className="pn-muted">Cargando…</p>}
    </>
  );

  const a = d.account, w = d.wedding;
  const st = accountState({ suspendedAt: a.suspendedAt, publication: w?.publication?.status ?? null });
  const pub = w?.publication?.status;

  return (
    <>
      <Link to="/admin" className="pn-link"><ArrowLeft size={16} aria-hidden="true" />Cuentas</Link>
      <div>
        <h1>{a.names || 'Sin nombres todavía'}</h1>
        <p className="pn-sub">{a.email} · <span className={`adm-state${st.cls}`}>{st.label}</span></p>
      </div>
      {msg && <p className={`adm-msg${msg.error ? ' is-error' : ''}`} role={msg.error ? 'alert' : 'status'}>{msg.text}</p>}

      <section className="adm-card" aria-labelledby="adm-acc">
        <h2 id="adm-acc">Cuenta</h2>
        <dl className="adm-facts">
          <div><dt>Alta</dt><dd>{shortDate(a.createdAt)}</dd></div>
          <div><dt>Último ingreso</dt><dd>{dateTime(a.lastSignInAt)}</dd></div>
          <div><dt>Plan</dt><dd>{planName(w?.publication?.planId ?? w?.planId)}</dd></div>
          <div><dt>Sitio</dt><dd>{w?.slug ? <a href={`/sitio/${w.slug}`} target="_blank" rel="noreferrer">/sitio/{w.slug}</a> : 'Sin publicar'}</dd></div>
          <div><dt>Fecha del casamiento</dt><dd>{w?.date ? shortDate(`${w.date}T12:00:00`) : '—'}</dd></div>
          <div><dt>WhatsApp</dt><dd>{w?.whatsapp ? <a href={`https://wa.me/${w.whatsapp}`} target="_blank" rel="noreferrer">{formatPhone(w.whatsapp)}</a> : 'Sin cargar'}</dd></div>
          <div><dt>Alias de cobro</dt><dd>{w?.payout?.alias || 'Sin cargar'}</dd></div>
          {a.suspendedAt && <div><dt>Suspendida desde</dt><dd>{dateTime(a.suspendedAt)}{a.suspensionNote && ` · ${a.suspensionNote}`}</dd></div>}
        </dl>
        <div className="adm-actions">
          {a.suspendedAt
            ? <button type="button" className="pn-btn" disabled={busy} onClick={() => { void run('reactivate', 'Reactivamos la cuenta. Le avisamos por correo.'); }}>Reactivar</button>
            : <button type="button" className="pn-btn is-danger" disabled={busy} onClick={() => { setNote(''); setDialog('suspend'); }}>Suspender</button>}
          {pub === 'live' && <button type="button" className="pn-btn is-ghost" disabled={busy} onClick={() => { void run('unpublish', 'Despublicamos el sitio.'); }}>Despublicar</button>}
          {pub === 'taken_down' && <button type="button" className="pn-btn is-ghost" disabled={busy} onClick={() => { void run('republish', 'El sitio volvió a estar publicado.'); }}>Volver a publicar</button>}
          <button type="button" className="pn-btn is-ghost" disabled={busy} onClick={() => { setEmail(a.email); setDialog('email'); }}>Cambiar correo</button>
          <button type="button" className="pn-btn is-ghost" disabled={busy} onClick={() => { void run('reset', `Le mandamos el enlace para elegir una clave nueva a ${a.email}.`); }}>Mandar enlace de clave</button>
          {!a.suspendedAt && <button type="button" className="pn-btn is-ghost" disabled={busy} onClick={() => { void impersonate(); }}>Entrar como la pareja</button>}
        </div>
        <p className="pn-hint">«Entrar como» dura 30 minutos y no permite cambiar el cobro, el correo, la clave ni pagar.</p>
      </section>

      <section className="adm-card" aria-labelledby="adm-guests">
        <h2 id="adm-guests">Invitados ({w?.guests.length ?? 0})</h2>
        {w?.guests.length ? (
          <div className="adm-scroll"><table className="adm-table">
            <thead><tr><th>Nombre</th><th>Estado</th><th>Menú</th></tr></thead>
            <tbody>{w.guests.map(g => <tr key={g.id}><td>{g.first} {g.last}</td><td>{GUEST_STATUS[g.status] ?? g.status}</td><td>{g.menu || '—'}</td></tr>)}</tbody>
          </table></div>
        ) : <p className="pn-muted">Sin invitados.</p>}
      </section>

      <section className="adm-card" aria-labelledby="adm-gifts">
        <h2 id="adm-gifts">Regalos ({w?.gifts.length ?? 0})</h2>
        {w?.gifts.length ? (
          <div className="adm-scroll"><table className="adm-table">
            <thead><tr><th>Regalo</th><th>Categoría</th><th>Monto</th></tr></thead>
            <tbody>{w.gifts.map(g => <tr key={g.id}><td>{g.name}</td><td>{g.category || '—'}</td><td>{w.currency === 'USD' ? money(priceIn(g, 'USD'), 'USD') : w.currency === 'both' ? `${money(g.amount)} · ${money(priceIn(g, 'USD'), 'USD')}` : money(g.amount)}</td></tr>)}</tbody>
          </table></div>
        ) : <p className="pn-muted">Sin regalos.</p>}
      </section>

      <section className="adm-card" aria-labelledby="adm-contrib">
        <h2 id="adm-contrib">Aportes recibidos ({d.contributions.length})</h2>
        {d.contributions.length ? (
          <div className="adm-scroll"><table className="adm-table">
            <thead><tr><th>De</th><th>Total</th><th>Estado</th><th>Comprobante</th></tr></thead>
            <tbody>{d.contributions.map(c => (
              <tr key={c.id}>
                <td>{c.giverName}</td><td>{money(c.total, c.currency ?? 'ARS')}</td><td>{CONTRIB_STATUS[c.status] ?? c.status}</td>
                <td>{c.hasReceipt ? <a href={`/api/admin/accounts/${userId}/contributions/${c.id}/receipt`} target="_blank" rel="noreferrer">Ver</a> : '—'}</td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <p className="pn-muted">Sin aportes.</p>}
      </section>

      <section className="adm-card" aria-labelledby="adm-log">
        <h2 id="adm-log">Registro de acciones</h2>
        {d.actions.length ? (
          <ul className="adm-list">{d.actions.map((x, i) => (
            <li key={`${x.at}-${i}`} className="pn-muted">{dateTime(x.at)} · {ACTION_LABEL[x.action] ?? x.action}{typeof x.detail['to'] === 'string' ? ` (a ${x.detail['to']})` : ''}</li>
          ))}</ul>
        ) : <p className="pn-muted">Todavía no hay acciones.</p>}
      </section>

      <Dialog open={dialog === 'suspend'} onOpenChange={o => { if (!o) setDialog(null); }}>
        <DialogContent className="pn-dialog">
          <DialogTitle>¿Suspender la cuenta de {a.names || a.email}?</DialogTitle>
          <DialogDescription>No va a poder ingresar y su sitio no se va a ver. No se borra nada y la podés reactivar cuando quieras. Le avisamos por correo.</DialogDescription>
          <div className="adm-field">
            <label htmlFor="adm-note">Motivo (opcional, solo lo ves vos)</label>
            <textarea id="adm-note" rows={2} maxLength={300} value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <div className="adm-actions">
            <button type="button" className="pn-btn is-danger" disabled={busy} onClick={() => { void run('suspend', 'Suspendimos la cuenta. Le avisamos por correo.', { note }); }}>Suspender</button>
            <button type="button" className="pn-btn is-ghost" onClick={() => setDialog(null)}>Cancelar</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'email'} onOpenChange={o => { if (!o) setDialog(null); }}>
        <DialogContent className="pn-dialog">
          <DialogTitle>Cambiar el correo de la cuenta</DialogTitle>
          <DialogDescription>Desde ahora va a ingresar con el correo nuevo. Le avisamos al anterior y al nuevo.</DialogDescription>
          <form className="adm-field" onSubmit={e => { e.preventDefault(); void run('email', 'Cambiamos el correo. Avisamos a los dos correos.', { email }); }}>
            <label htmlFor="adm-email">Correo nuevo</label>
            <input id="adm-email" type="email" autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} />
            <div className="adm-actions">
              <button type="submit" className="pn-btn" disabled={busy}>Cambiar correo</button>
              <button type="button" className="pn-btn is-ghost" onClick={() => setDialog(null)}>Cancelar</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
