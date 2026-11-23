// @vitest-environment node
// GIFT-10 · Moneda de la lista en el servidor (specs/GIFT-10-moneda-de-la-lista/spec.md): CA-4, CA-6, CA-7, CA-8.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { draftFor, eventually, makeEnv, PNG, publishWith, saveDraft, signUp, type Env } from './helpers';
import type { AppState } from '@/lib/weda/types';

let env: Env;
beforeAll(async () => { env = await makeEnv(); });
afterAll(() => env.close());

const contribution = (key: string, giftIds = ['g1']) => ({ idempotencyKey: `key-${key}-0001`, manageToken: `token-del-invitado-${key}`, giverName: 'Tía Nora', giverEmail: 'nora@correo.com', message: '', how: 'alias', giftIds, receipt: { data: Buffer.from(PNG).toString('base64') } });
/** Borrador en dólares: regalos con montos en dólares. */
const usd = (d: AppState): AppState => ({ ...d, gifts: { ...d.gifts, currency: 'USD', items: d.gifts.items.map(g => ({ ...g, amount: g.id === 'g1' ? 120 : 200 })) } });

describe('GIFT-10 · moneda de la lista en el servidor', () => {
  it('CA-6, CA-7: un aporte a una lista en dólares guarda «USD», se lista con su moneda y la constancia dice «US$»', async () => {
    const c = env.client(); await signUp(c, 'dolares@correo.com');
    const { slug } = await publishWith(c, usd(draftFor('Dana', 'Leo')));
    expect((await env.client().get(`/api/public/${slug}`)).body.site.currency).toBe('USD');
    const before = env.cfg.mail.testOutbox!.length;
    const r = await env.client().post(`/api/public/${slug}/contributions`, contribution('usd'));
    expect(r.status).toBe(201);
    const row = await env.svc.db.get<{ currency: string; total: number }>('SELECT currency, total FROM contributions WHERE id = ?', r.body.id);
    expect(row).toMatchObject({ currency: 'USD' });
    expect(Number(row!.total)).toBe(120);
    const list = (await c.get('/api/contributions')).body.contributions;
    expect(list[0]).toMatchObject({ currency: 'USD', total: 120 });
    const mail = await eventually(() => Promise.resolve(env.cfg.mail.testOutbox!.slice(before).find(m => m.kind === 'gift_receipt')), m => !!m);
    expect(mail!.text.replace(/\u00a0/g, ' ')).toContain('US$ 120');
  });

  it('CA-4: con aportes recibidos la moneda no se puede cambiar; sin aportes, sí', async () => {
    const c = env.client(); await signUp(c, 'fija@correo.com');
    const draft = draftFor('Fina', 'Juan');
    // Sin aportes: se puede pasar a dólares y volver.
    expect(await saveDraft(c, usd(draft))).toBeTruthy();
    expect(await saveDraft(c, draft)).toBeTruthy();
    const { slug } = await publishWith(c, draft);
    expect((await env.client().post(`/api/public/${slug}/contributions`, contribution('fija'))).status).toBe(201);
    const w = (await c.get('/api/wedding')).body;
    const r = await c.put('/api/wedding', { baseRevision: w.revision, draft: usd(w.draft) });
    expect([r.status, r.body.error]).toEqual([409, 'currency_locked']);
  });

  it('las páginas publicadas antes no tienen moneda: son pesos, y el aporte se guarda en «ARS»', async () => {
    const c = env.client(); await signUp(c, 'vieja@correo.com');
    const { slug } = await publishWith(c, draftFor('Vera', 'Iván'));
    const r = await env.client().post(`/api/public/${slug}/contributions`, contribution('vieja'));
    const row = await env.svc.db.get<{ currency: string }>('SELECT currency FROM contributions WHERE id = ?', r.body.id);
    expect(row?.currency).toBe('ARS');
  });
});
