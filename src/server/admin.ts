// ADM-01 · Administración de cuentas (spec y plan en specs/ADM-01-administracion-cuentas/). Solo la cuenta cuyo correo es `WEDA_ADMIN_EMAIL`.
// Ninguna acción borra filas de las tablas de Weda (BR-43, RK-05): suspender bloquea el ingreso y oculta el sitio; reactivar lo deshace.
// Cada acción queda en `admin_actions`, que es solo de agregado (un disparador impide modificarla o borrarla).
import type { Db } from './db';
import { conflict, invalid, notFound } from './errors';
import { layout, sendMail } from './mail';
import { newId, newToken, sha256 } from './security';
import type { Service, Session } from './service';
import { isEmail } from '@/lib/weda/logic';
import { maskPhone } from '@/lib/weda/phone';

type Row = Record<string, unknown>;
const now = () => new Date().toISOString();
/** Cuánto dura «entrar como» una pareja (D5). */
export const IMPERSONATION_MS = 30 * 60 * 1000;
const PAGE = 50;

export type AdminAction = 'view' | 'suspend' | 'reactivate' | 'unpublish' | 'republish' | 'change_email' | 'send_reset' | 'impersonate_start' | 'impersonate_end' | 'impersonated_save' | 'view_receipt';

export type AccountSummary = {
  id: string; email: string; createdAt: string; lastSignInAt: string | null;
  names: string; planId: string | null; publication: string | null; slug: string | null; suspendedAt: string | null;
};

const iso = (col: string) => `to_char(${col} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;

export class Admin {
  constructor(private svc: Service) {}
  private get db(): Db { return this.svc.db; }

  /** ¿Esta sesión es la de la administradora? Sin `WEDA_ADMIN_EMAIL`, nadie lo es. */
  isAdmin(s: Session | null | undefined): boolean {
    const admin = this.svc.cfg.adminEmail;
    return !!admin && !!s && s.email.trim().toLowerCase() === admin;
  }

  /** CA-1: para cualquier otra sesión (o sin sesión) la administración no existe: 404, sin revelar nada. */
  require(s: Session | null | undefined): Session {
    if (!s || !this.isAdmin(s)) throw notFound('not_found');
    return s;
  }

  private async log(admin: Session, target: string | null, action: AdminAction, detail: Record<string, string | number | boolean> = {}) {
    await this.db.run('INSERT INTO admin_actions (id,at,admin_id,target_user_id,action,detail) VALUES (?,?,?,?,?,?)', newId('adm'), now(), admin.userId, target, action, JSON.stringify(detail));
  }

  private async email(userId: string): Promise<string> {
    const e = await this.svc.accounts.emailOf(userId);
    if (!e) throw notFound('account_not_found');
    return e;
  }

  private notice(to: string, subject: string, paragraphs: string[], ref: string) {
    const body = layout({ title: subject, paragraphs: [...paragraphs, 'Si tenés dudas, respondé este correo o escribinos a hola@weda.app.'] });
    void sendMail(this.db, this.svc.cfg, 'account_notice', { to, subject, ...body }, ref);
  }

  /* ------------------------------------------------------------------ lectura */

  /** CA-2: cuentas, de la más nueva a la más vieja, con búsqueda por correo o por los nombres de la pareja. */
  async list(admin: Session, qRaw: unknown, pageRaw: unknown): Promise<{ accounts: AccountSummary[]; hasMore: boolean }> {
    this.require(admin);
    const q = typeof qRaw === 'string' ? qRaw.trim().toLowerCase().slice(0, 100) : '';
    const page = Math.max(0, Math.min(1000, Number.parseInt(String(pageRaw ?? '0'), 10) || 0));
    const like = `%${q.replace(/[\\%_]/g, m => `\\${m}`)}%`;
    const where = q ? `WHERE lower(u.email) LIKE ? OR lower(coalesce(w.draft::jsonb #>> '{couple,first}', '')) LIKE ? OR lower(coalesce(w.draft::jsonb #>> '{couple,second}', '')) LIKE ?` : '';
    const rows = (await this.db.all(
      `SELECT u.id::text AS id, u.email AS email, ${iso('u.created_at')} AS created_at, ${iso('u.last_sign_in_at')} AS last_sign_in_at,
              w.draft::jsonb #>> '{couple,first}' AS first, w.draft::jsonb #>> '{couple,second}' AS second, w.slug AS slug,
              p.status AS pub_status, coalesce(p.plan_id, w.draft::jsonb ->> 'planId') AS plan_id, s.suspended_at AS suspended_at
         FROM auth.users u
         LEFT JOIN weddings w ON w.owner_id = u.id
         LEFT JOIN publications p ON p.wedding_id = w.id
         LEFT JOIN account_suspensions s ON s.user_id = u.id
         ${where}
         ORDER BY u.created_at DESC, u.id
         LIMIT ${PAGE + 1} OFFSET ${page * PAGE}`,
      ...(q ? [like, like, like] : []))) as Row[];
    const accounts = rows.slice(0, PAGE).map(r => ({
      id: r['id'] as string,
      email: r['email'] as string,
      createdAt: r['created_at'] as string,
      lastSignInAt: (r['last_sign_in_at'] as string | null) ?? null,
      names: [r['first'], r['second']].filter(x => typeof x === 'string' && x.trim()).join(' & '),
      planId: (r['plan_id'] as string | null) ?? null,
      publication: (r['pub_status'] as string | null) ?? null,
      slug: (r['slug'] as string | null) ?? null,
      suspendedAt: (r['suspended_at'] as string | null) ?? null,
    }));
    return { accounts, hasMore: rows.length > PAGE };
  }

  /** CA-3: todo lo de una cuenta, en solo lectura. No crea el casamiento si todavía no existe. */
  async detail(admin: Session, userId: string) {
    this.require(admin);
    const row = (await this.db.get(
      `SELECT u.id::text AS id, u.email AS email, ${iso('u.created_at')} AS created_at, ${iso('u.last_sign_in_at')} AS last_sign_in_at, s.suspended_at AS suspended_at, s.note AS note
         FROM auth.users u LEFT JOIN account_suspensions s ON s.user_id = u.id WHERE u.id::text = ?`, userId)) as Row | undefined;
    if (!row) throw notFound('account_not_found');
    const hasWedding = !!(await this.db.get('SELECT 1 FROM weddings WHERE owner_id::text = ?', userId));
    const wedding = hasWedding ? await this.svc.getWedding(userId) : null;
    const contributions = hasWedding ? await this.svc.listContributions(userId) : [];
    const actions = ((await this.db.all('SELECT at, action, detail FROM admin_actions WHERE target_user_id::text = ? ORDER BY at DESC LIMIT 100', userId)) as Row[])
      .map(r => ({ at: r['at'] as string, action: r['action'] as string, detail: JSON.parse(r['detail'] as string) as Record<string, unknown> }));
    await this.log(admin, userId, 'view');
    return {
      account: {
        id: userId, email: row['email'] as string, createdAt: row['created_at'] as string, lastSignInAt: (row['last_sign_in_at'] as string | null) ?? null,
        suspendedAt: (row['suspended_at'] as string | null) ?? null, suspensionNote: (row['note'] as string | null) ?? '',
        names: wedding ? [wedding.draft.couple.first, wedding.draft.couple.second].filter(x => x.trim()).join(' & ') : '',
      },
      wedding: wedding && {
        slug: wedding.slug, planId: wedding.draft.planId, currency: wedding.draft.gifts.currency ?? 'ARS', publication: wedding.publication, access: wedding.access,
        couple: wedding.draft.couple, date: wedding.draft.date, whatsapp: wedding.draft.couple.whatsapp ?? '',
        guests: wedding.guests, gifts: wedding.draft.gifts.items,
        // Del cobro solo se muestra que existe y enmascarado: la administración no lo cambia (IC-04).
        payout: wedding.payout ? { alias: wedding.payout.alias ? `${wedding.payout.alias.slice(0, 3)}…` : '', changedAt: wedding.payout.changedAt } : null,
      },
      // GIFT-15 (D8): el WhatsApp de quien regala se ve enmascarado en la administración.
      contributions: contributions.map(c => ({ ...c, giverPhone: maskPhone(c.giverPhone) })),
      actions,
    };
  }

  /** Comprobante de un aporte, solo desde el detalle (CA-3). Queda registrado. */
  async receipt(admin: Session, userId: string, contributionId: string) {
    this.require(admin);
    const r = await this.svc.readReceipt(userId, contributionId);
    await this.log(admin, userId, 'view_receipt', { contribution: contributionId });
    return r;
  }

  /* ------------------------------------------------------------------ acciones */

  /** CA-4: bloquea el ingreso, cierra sus sesiones y oculta su sitio. No borra nada. */
  async suspend(admin: Session, userId: string, noteRaw: unknown) {
    this.require(admin);
    if (userId === admin.userId) throw invalid('cannot_suspend_self');
    const email = await this.email(userId);
    const note = typeof noteRaw === 'string' ? noteRaw.trim().slice(0, 300) : '';
    await this.db.tx(`adm|${userId}`, async () => {
      if (await this.svc.isSuspended(userId)) throw conflict('already_suspended');
      await this.db.run('INSERT INTO account_suspensions (user_id,suspended_at,note) VALUES (?,?,?)', userId, now(), note);
      await this.log(admin, userId, 'suspend', note ? { note } : {});
      // Si Supabase falla, la transacción se deshace: la tabla y el bloqueo no quedan distintos.
      await this.svc.accounts.setBanned(userId, true);
    });
    await this.db.run('DELETE FROM auth.sessions WHERE user_id::text = ?', userId);
    this.notice(email, 'Tu cuenta de Weda está suspendida', ['Suspendimos tu cuenta de Weda: por ahora no podés ingresar y tu página no se ve.', 'No borramos nada de lo que armaste.'], userId);
    return { ok: true as const };
  }

  /** CA-4: deshace la suspensión. Todo vuelve como estaba. */
  async reactivate(admin: Session, userId: string) {
    this.require(admin);
    const email = await this.email(userId);
    await this.db.tx(`adm|${userId}`, async () => {
      const r = await this.db.run('DELETE FROM account_suspensions WHERE user_id::text = ?', userId);
      if (Number(r.changes) === 0) throw conflict('not_suspended');
      await this.log(admin, userId, 'reactivate');
      await this.svc.accounts.setBanned(userId, false);
    });
    this.notice(email, 'Tu cuenta de Weda está activa de nuevo', ['Reactivamos tu cuenta de Weda: ya podés ingresar y tu página se ve como antes.'], userId);
    return { ok: true as const };
  }

  /** CA-6: igual que cuando la pareja la baja. */
  async unpublish(admin: Session, userId: string) {
    this.require(admin);
    await this.svc.unpublish(userId);
    await this.log(admin, userId, 'unpublish');
    return { ok: true as const };
  }

  /** CA-6: vuelve a poner en línea la última versión publicada (sin publicar cambios del borrador). */
  async republish(admin: Session, userId: string) {
    this.require(admin);
    await this.svc.restorePublication(userId);
    await this.log(admin, userId, 'republish');
    return { ok: true as const };
  }

  /** CA-7: cambia el correo de ingreso y avisa a los dos correos. */
  async changeEmail(admin: Session, userId: string, emailRaw: unknown) {
    this.require(admin);
    const next = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';
    if (!isEmail(next) || next.length > 200) throw invalid('invalid_email');
    const prev = await this.email(userId);
    if (prev.toLowerCase() === next) throw conflict('same_email');
    await this.svc.accounts.setEmail(userId, next);
    await this.log(admin, userId, 'change_email', { from: prev, to: next });
    const msg = [`Cambiamos el correo de tu cuenta de Weda de ${prev} a ${next}. Desde ahora ingresás con el correo nuevo.`, 'Si no lo pediste, respondé este correo enseguida.'];
    this.notice(prev, 'Cambió el correo de tu cuenta de Weda', msg, userId);
    this.notice(next, 'Cambió el correo de tu cuenta de Weda', msg, userId);
    return { ok: true as const, email: next };
  }

  /** CA-8: el mismo enlace que «Olvidé mi clave». La administración nunca ve ni escribe una clave (D4). */
  async sendReset(admin: Session, userId: string) {
    this.require(admin);
    const email = await this.email(userId);
    await this.svc.requestPasswordReset(email, `admin|${admin.userId}`);
    await this.log(admin, userId, 'send_reset');
    return { ok: true as const };
  }

  /* ------------------------------------------------------------------ entrar como (D5) */

  /** CA-9: abre «entrar como» por 30 minutos. Devuelve el token de la cookie `weda_as` (en la base solo queda su hash). */
  async startImpersonation(admin: Session, userId: string): Promise<{ token: string; expiresAt: string }> {
    this.require(admin);
    if (userId === admin.userId) throw invalid('cannot_impersonate_self');
    await this.email(userId);
    if (await this.svc.isSuspended(userId)) throw conflict('account_suspended');
    const token = newToken();
    const started = new Date();
    const expiresAt = new Date(started.getTime() + IMPERSONATION_MS).toISOString();
    await this.db.tx(`adm|${userId}`, async () => {
      // Una sola a la vez: abrir otra cierra las anteriores de la administradora.
      await this.db.run('UPDATE admin_impersonations SET ended_at = ? WHERE admin_id::text = ? AND ended_at IS NULL', started.toISOString(), admin.userId);
      await this.db.run('INSERT INTO admin_impersonations (id,admin_id,target_user_id,token_hash,started_at,expires_at,ended_at) VALUES (?,?,?,?,?,?,NULL)',
        newId('imp'), admin.userId, userId, sha256(token), started.toISOString(), expiresAt);
      await this.log(admin, userId, 'impersonate_start');
    });
    return { token, expiresAt };
  }

  /** La sesión efectiva cuando la administradora está «entrando como»: la de la pareja, marcada. null si no hay o venció. */
  async impersonated(admin: Session | null, token: string | undefined): Promise<(Session & { impersonation: { adminId: string; expiresAt: string } }) | null> {
    if (!token || !admin || !this.isAdmin(admin)) return null;
    const row = (await this.db.get('SELECT target_user_id::text AS target, expires_at, ended_at FROM admin_impersonations WHERE token_hash = ? AND admin_id::text = ?', sha256(token), admin.userId)) as Row | undefined;
    if (!row || row['ended_at'] || Date.parse(row['expires_at'] as string) <= Date.now()) return null;
    const target = row['target'] as string;
    if (await this.svc.isSuspended(target)) return null;
    const email = await this.svc.accounts.emailOf(target);
    if (!email) return null;
    return { userId: target, email, impersonation: { adminId: admin.userId, expiresAt: row['expires_at'] as string } };
  }

  async endImpersonation(admin: Session, token: string | undefined): Promise<string | null> {
    this.require(admin);
    if (!token) return null;
    const row = (await this.db.get('SELECT id, target_user_id::text AS target FROM admin_impersonations WHERE token_hash = ? AND admin_id::text = ? AND ended_at IS NULL', sha256(token), admin.userId)) as Row | undefined;
    if (!row) return null;
    await this.db.run('UPDATE admin_impersonations SET ended_at = ? WHERE id = ?', now(), row['id'] as string);
    await this.log(admin, row['target'] as string, 'impersonate_end');
    return row['target'] as string;
  }

  /** Cada guardado hecho «como» la pareja (D6). */
  async logImpersonatedSave(adminId: string, target: string, what: string) {
    await this.db.run('INSERT INTO admin_actions (id,at,admin_id,target_user_id,action,detail) VALUES (?,?,?,?,?,?)', newId('adm'), now(), adminId, target, 'impersonated_save', JSON.stringify({ what }));
  }
}

/** Rutas que nunca se usan «entrando como» una pareja (D5, CA-9): cobro, clave, sesiones, pagos. */
export const blockedWhileImpersonating = (a: string | undefined, b: string | undefined, c: string | undefined, method: string): boolean =>
  (a === 'wedding' && b === 'payout') ||
  (a === 'auth' && (b === 'password' || (b === 'sessions' && c === 'close-others'))) ||
  (a === 'orders' && method !== 'GET') ||
  a === 'checkout' || a === 'test-payments';

