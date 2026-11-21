// @vitest-environment node
// ADM-01 · Administración de cuentas: un criterio de aceptación por bloque (specs/ADM-01-administracion-cuentas/spec.md).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { draftFor, makeEnv, PASSWORD, publishWith, signUp, type Client, type Env } from './helpers';

const ADMIN = 'duena@correo.com';
let env: Env;
let boss: Client;
beforeAll(async () => {
  env = await makeEnv({ adminEmail: ADMIN });
  boss = env.client(); await signUp(boss, ADMIN);
});
afterAll(() => env.close());

const outbox = () => env.cfg.mail.testOutbox!;
const login = (email: string, password = PASSWORD) => env.client().post('/api/auth/login', { email, password });
const idOf = async (email: string) => (await env.svc.accounts.idByEmail(email))!;
/** Una pareja con sitio publicado (Celebración) y una confirmación de asistencia. */
async function couple(email: string, first: string, second: string) {
  const c = env.client(); await signUp(c, email);
  const slug = (await publishWith(c, draftFor(first, second))).slug as string;
  expect((await env.client().post(`/api/public/${slug}/rsvp`, { people: [{ first: 'Ana', last: 'Paz', attending: true, menu: '' }] })).status).toBe(200);
  return { c, slug: slug as string, id: await idOf(email) };
}
const TABLES = ['weddings', 'guests', 'rsvp_events', 'publications', 'orders', 'contributions', 'contribution_items', 'receipts', 'payout_methods', 'password_resets'];
async function counts() {
  const out: Record<string, number> = {};
  for (const t of TABLES) out[t] = Number(((await env.svc.db.get(`SELECT COUNT(*) AS n FROM ${t}`)) as { n: number }).n);
  return out;
}

describe('ADM-01 · administración de cuentas', () => {
  it('CA-1: solo la administradora; para el resto la administración no existe', async () => {
    expect((await env.client().get('/api/admin/accounts')).status).toBe(404);
    const common = env.client(); await signUp(common, 'comun@correo.com');
    expect((await common.get('/api/admin/accounts')).status).toBe(404);
    expect((await common.post(`/api/admin/accounts/${await idOf(ADMIN)}/suspend`, {})).status).toBe(404);
    expect((await boss.get('/api/admin/accounts')).status).toBe(200);
    expect((await boss.get('/api/me')).body.admin).toBe(true);
    expect((await common.get('/api/me')).body.admin).toBe(false);
    // Sin WEDA_ADMIN_EMAIL nadie es administrador.
    const saved = env.cfg.adminEmail; env.cfg.adminEmail = undefined;
    try { expect((await boss.get('/api/admin/accounts')).status).toBe(404); } finally { env.cfg.adminEmail = saved; }
  });

  it('CA-2 y CA-3: lista con búsqueda y detalle en solo lectura, sin crear casamientos', async () => {
    const p = await couple('lista@correo.com', 'Lola', 'Bruno');
    const found = (await boss.get('/api/admin/accounts?q=lola')).body.accounts as { id: string; names: string; publication: string }[];
    expect(found.find(a => a.id === p.id)).toMatchObject({ names: 'Lola & Bruno', publication: 'live' });
    const d = (await boss.get(`/api/admin/accounts/${p.id}`)).body;
    expect(d.account.names).toBe('Lola & Bruno');
    expect(d.wedding.guests.map((g: { first: string }) => g.first)).toContain('Ana');
    expect(d.wedding.gifts.length).toBeGreaterThan(0);
    expect(Array.isArray(d.contributions)).toBe(true);
    // Una cuenta sin casamiento no lo crea al mirarla.
    const empty = env.client(); await signUp(empty, 'vacia@correo.com');
    const before = (await counts())['weddings'];
    expect((await boss.get(`/api/admin/accounts/${await idOf('vacia@correo.com')}`)).body.wedding).toBeNull();
    expect((await counts())['weddings']).toBe(before);
  });

  it('CA-4, CA-5 y CA-11: suspender bloquea el ingreso y oculta el sitio sin borrar nada; reactivar lo devuelve', async () => {
    const p = await couple('susp@correo.com', 'Sara', 'Tomás');
    const before = await counts();
    const mails = outbox().length;
    expect((await boss.post(`/api/admin/accounts/${p.id}/suspend`, { note: 'reclamo' })).status).toBe(200);
    expect((await login('susp@correo.com')).body.error).toBe('account_suspended');
    expect((await p.c.get('/api/me')).body.user).toBeNull();            // sus sesiones abiertas ya no valen
    expect((await env.client().get(`/api/public/${p.slug}`)).body.error).toBe('site_unavailable');
    expect((await env.client().get('/api/search?q=sara')).body.results).toEqual([]);
    expect(await counts()).toEqual(before);                              // CA-5
    expect(outbox().slice(mails).some(m => m.kind === 'account_notice' && m.to === 'susp@correo.com')).toBe(true);
    expect((await boss.post(`/api/admin/accounts/${p.id}/suspend`, {})).body.error).toBe('already_suspended');

    expect((await boss.post(`/api/admin/accounts/${p.id}/reactivate`)).status).toBe(200);
    expect((await login('susp@correo.com')).status).toBe(200);
    expect((await env.client().get(`/api/public/${p.slug}`)).status).toBe(200);
    expect(await counts()).toEqual(before);
    expect(outbox().slice(mails).filter(m => m.kind === 'account_notice').length).toBe(2);
  });

  it('CA-6: despublicar y volver a publicar la misma versión', async () => {
    const p = await couple('pub@correo.com', 'Paula', 'Iván');
    expect((await boss.post(`/api/admin/accounts/${p.id}/unpublish`)).status).toBe(200);
    expect((await env.client().get(`/api/public/${p.slug}`)).body.error).toBe('site_unpublished');
    expect((await boss.post(`/api/admin/accounts/${p.id}/republish`)).status).toBe(200);
    expect((await env.client().get(`/api/public/${p.slug}`)).status).toBe(200);
    expect((await boss.post(`/api/admin/accounts/${p.id}/republish`)).body.error).toBe('not_taken_down');
  });

  it('CA-7 y CA-8: cambiar el correo (con aviso a los dos) y mandar el enlace de clave', async () => {
    const c = env.client(); await signUp(c, 'viejo@correo.com');
    const id = await idOf('viejo@correo.com');
    const mails = outbox().length;
    expect((await boss.post(`/api/admin/accounts/${id}/email`, { email: 'no-es-correo' })).body.error).toBe('invalid_email');
    expect((await boss.post(`/api/admin/accounts/${id}/email`, { email: 'Nuevo@Correo.com' })).status).toBe(200);
    expect((await login('nuevo@correo.com')).status).toBe(200);
    expect((await login('viejo@correo.com')).status).toBe(401);
    const to = outbox().slice(mails).filter(m => m.kind === 'account_notice').map(m => m.to).sort();
    expect(to).toEqual(['nuevo@correo.com', 'viejo@correo.com']);
    expect((await boss.post(`/api/admin/accounts/${id}/reset`)).status).toBe(200);
    expect(outbox().slice(mails).some(m => m.kind === 'password_reset' && m.to === 'nuevo@correo.com')).toBe(true);
  });

  it('CA-9: entrar como la pareja, con límites y vencimiento', async () => {
    const p = await couple('como@correo.com', 'Clara', 'Diego');
    const r = await boss.post(`/api/admin/accounts/${p.id}/impersonate`);
    expect(r.status).toBe(200);
    const me = (await boss.get('/api/me')).body;
    expect(me.user.email).toBe(ADMIN);
    expect(me.impersonating).toMatchObject({ email: 'como@correo.com' });
    const w = (await boss.get('/api/wedding')).body;
    expect(w.draft.couple).toMatchObject({ first: 'Clara', second: 'Diego' });
    const put = await boss.put('/api/wedding', { baseRevision: w.revision, draft: { ...w.draft, couple: { first: 'Clara', second: 'Diego Luis' } } });
    expect(put.status).toBe(200);
    expect((await p.c.get('/api/wedding')).body.draft.couple.second).toBe('Diego Luis');
    // Lo que nunca se toca «como» la pareja.
    expect((await boss.post('/api/wedding/payout', { alias: 'otro.alias', password: PASSWORD })).body.error).toBe('not_allowed_as_admin');
    expect((await boss.post('/api/auth/password', { currentPassword: PASSWORD, newPassword: 'OtraClave99' })).body.error).toBe('not_allowed_as_admin');
    expect((await boss.post('/api/auth/sessions/close-others')).body.error).toBe('not_allowed_as_admin');
    expect((await boss.post('/api/checkout', { planId: 'completo' })).body.error).toBe('not_allowed_as_admin');
    expect((await boss.post('/api/orders', { planId: 'completo' })).body.error).toBe('not_allowed_as_admin');
    // Una cuenta común con la cookie de otra persona no entra como nadie.
    const thief = env.client(); await signUp(thief, 'ladron@correo.com');
    const asCookie = boss.cookie.split('; ').find(x => x.startsWith('weda_as='))!;
    thief.cookie = `${thief.cookie}; ${asCookie}`;
    expect((await thief.get('/api/wedding')).body.draft.couple.first).not.toBe('Clara');
    // Vence a los 30 minutos: después, la administradora vuelve a ser ella misma.
    await env.svc.db.run("UPDATE admin_impersonations SET expires_at = '2000-01-01T00:00:00.000Z' WHERE target_user_id::text = ?", p.id);
    expect((await boss.get('/api/me')).body.impersonating).toBeNull();
    expect((await boss.get('/api/wedding')).body.draft.couple.first).not.toBe('Clara');
    // Salir explícitamente también la cierra.
    await boss.post(`/api/admin/accounts/${p.id}/impersonate`);
    expect((await boss.post('/api/admin/impersonation/end')).body.userId).toBe(p.id);
    expect((await boss.get('/api/me')).body.impersonating).toBeNull();
  });

  it('CA-10: cada acción queda registrada y el registro no se puede modificar', async () => {
    const p = await couple('reg@correo.com', 'Rita', 'Gael');
    await boss.post(`/api/admin/accounts/${p.id}/unpublish`);
    await boss.post(`/api/admin/accounts/${p.id}/impersonate`);
    const w = (await boss.get('/api/wedding')).body;
    await boss.put('/api/wedding', { baseRevision: w.revision, draft: w.draft });
    await boss.post('/api/admin/impersonation/end');
    const actions = (await boss.get(`/api/admin/accounts/${p.id}`)).body.actions.map((a: { action: string }) => a.action);
    expect(actions).toEqual(expect.arrayContaining(['unpublish', 'impersonate_start', 'impersonated_save', 'impersonate_end']));
    await expect(env.svc.db.run("UPDATE admin_actions SET action = 'otra'")).rejects.toThrow();
    await expect(env.svc.db.run('DELETE FROM admin_actions')).rejects.toThrow();
  });
});
