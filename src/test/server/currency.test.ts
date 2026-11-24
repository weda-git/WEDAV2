// @vitest-environment node
// GIFT-10 v2 · Moneda de la lista en el servidor (specs/GIFT-10-moneda-de-la-lista/spec.md): CA-5, CA-6, CA-8, CA-9.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { draftFor, eventually, makeEnv, PASSWORD, PNG, publishWith, setPayout, signUp, type Env } from './helpers';
import type { AppState } from '@/lib/weda/types';

let env: Env;
beforeAll(async () => { env = await makeEnv(); });
afterAll(() => env.close());

const contribution = (key: string, extra: Record<string, unknown> = {}) => ({ idempotencyKey: `key-${key}-0001`, manageToken: `token-del-invitado-${key}`, giverName: 'Tía Nora', giverEmail: 'nora@correo.com', message: '', how: 'alias', giftIds: ['g1'], receipt: { data: Buffer.from(PNG).toString('base64') }, ...extra });
/** Lista en las dos monedas: g1 vale $ 180.000 o US$ 120. */
const both = (d: AppState): AppState => ({ ...d, gifts: { ...d.gifts, currency: 'both', items: d.gifts.items.map(g => ({ ...g, amountUsd: g.id === 'g1' ? 120 : 200 })) } });

describe('GIFT-10 v2 · moneda de la lista en el servidor', () => {
  it('CA-6: una cuenta por moneda, cada una con sus versiones; la de dólares llega al borrador y a la página publicada', async () => {
    const c = env.client(); await signUp(c, 'cuentas@correo.com');
    await publishWith(c, both(draftFor('Dana', 'Leo')));
    expect((await setPayout(c, { alias: 'dana.leo.pesos' })).status).toBe(200);
    const w0 = (await c.get('/api/wedding')).body;
    expect(w0.payoutUsd.version).toBe(0);
    const r = await c.post('/api/wedding/payout', { currency: 'USD', baseVersion: 0, alias: 'dana.leo.usd', bank: 'Banco Dólar', cbu: '' });
    expect(r.status).toBe(200);
    expect(r.body.payoutUsd).toMatchObject({ alias: 'dana.leo.usd', bank: 'Banco Dólar' });
    expect(r.body.payout.alias).toBe('dana.leo.pesos');
    // Cambiar la de dólares pide la clave, sobre SU versión vigente.
    const v = r.body.payoutUsd.version;
    expect((await c.post('/api/wedding/payout', { currency: 'USD', baseVersion: v, alias: 'otra.cuenta.usd' })).body.error).toBe('wrong_password');
    expect((await c.post('/api/wedding/payout', { currency: 'USD', baseVersion: v, alias: 'otra.cuenta.usd', currentPassword: PASSWORD })).status).toBe(200);
    expect((await c.post('/api/wedding/payout', { currency: 'EUR', baseVersion: 0, alias: 'x.y.z.eur' })).body.error).toBe('invalid_currency');
    const w = (await c.get('/api/wedding')).body;
    expect(w.draft.gifts.usd.alias).toBe('otra.cuenta.usd');
    expect(w.draft.gifts.alias).toBe('dana.leo.pesos');
    const { slug } = (await c.post('/api/wedding/publish')).body;
    const site = (await env.client().get(`/api/public/${slug}`)).body.site;
    expect(site.currencies).toEqual(['ARS', 'USD']);
    expect(site.usd.alias).toBe('otra.cuenta.usd');
  });

  it('CA-8, CA-9: el invitado elige la moneda; el monto sale de lo publicado en esa moneda y cada aporte guarda la suya', async () => {
    const c = env.client(); await signUp(c, 'dos@correo.com');
    const { slug } = await publishWith(c, both(draftFor('Fina', 'Juan')));
    const before = env.cfg.mail.testOutbox!.length;
    const usd = await env.client().post(`/api/public/${slug}/contributions`, contribution('usd', { currency: 'USD' }));
    expect(usd.status).toBe(201);
    const ars = await env.client().post(`/api/public/${slug}/contributions`, contribution('ars', { currency: 'ARS' }));
    expect(ars.status).toBe(201);
    const row = async (id: string) => env.svc.db.get<{ currency: string; total: number }>('SELECT currency, total FROM contributions WHERE id = ?', id);
    expect(await row(usd.body.id)).toMatchObject({ currency: 'USD' });
    expect(Number((await row(usd.body.id))!.total)).toBe(120);
    expect(await row(ars.body.id)).toMatchObject({ currency: 'ARS' });
    expect(Number((await row(ars.body.id))!.total)).toBe(180000);
    const list = (await c.get('/api/contributions')).body.contributions as { currency: string; total: number }[];
    expect(list.map(x => [x.currency, Number(x.total)]).sort()).toEqual([['ARS', 180000], ['USD', 120]]);
    const mail = await eventually(() => Promise.resolve(env.cfg.mail.testOutbox!.slice(before).find(m => m.kind === 'gift_receipt' && m.text.includes('US$'))), m => !!m);
    expect(mail!.text.replace(/\u00a0/g, ' ')).toContain('US$ 120');
    // Cambiar la moneda con aportes recibidos está permitido (D9): lo recibido no cambia.
    const w = (await c.get('/api/wedding')).body;
    expect((await c.put('/api/wedding', { baseRevision: w.revision, draft: { ...w.draft, gifts: { ...w.draft.gifts, currency: 'ARS' } } })).status).toBe(200);
  });

  it('CA-8: una moneda que la página no muestra se rechaza; las páginas publicadas antes son en pesos', async () => {
    const c = env.client(); await signUp(c, 'vieja@correo.com');
    const { slug } = await publishWith(c, draftFor('Vera', 'Iván'));
    expect((await env.client().post(`/api/public/${slug}/contributions`, contribution('mal', { currency: 'USD' }))).body.error).toBe('invalid_currency');
    const r = await env.client().post(`/api/public/${slug}/contributions`, contribution('vieja'));
    expect(r.status).toBe(201);
    const row = await env.svc.db.get<{ currency: string }>('SELECT currency FROM contributions WHERE id = ?', r.body.id);
    expect(row?.currency).toBe('ARS');
  });
});
