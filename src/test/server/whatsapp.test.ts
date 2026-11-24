// @vitest-environment node
// GIFT-15 · WhatsApp de quien regala en el servidor (specs/GIFT-15-whatsapp-y-agradecer/spec.md): CA-3, CA-4, CA-5, CA-7.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { draftFor, makeEnv, PNG, publishWith, signUp, type Env } from './helpers';

let env: Env;
beforeAll(async () => { env = await makeEnv(); });
afterAll(() => env.close());

const gift = (key: string, extra: Record<string, unknown> = {}) => ({ idempotencyKey: `key-${key}-0001`, manageToken: `token-del-invitado-${key}`, giverName: 'Tía Nora', giverEmail: 'nora@correo.com', giverPhone: '5491155554444', message: '', how: 'alias', giftIds: ['g1'], receipt: { data: Buffer.from(PNG).toString('base64') }, ...extra });

describe('GIFT-15 · WhatsApp en el servidor', () => {
  it('CA-3: sin WhatsApp válido no se registra el regalo; con WhatsApp, la pareja lo ve en sus aportes', async () => {
    const c = env.client(); await signUp(c, 'wa@correo.com');
    const { slug } = await publishWith(c, draftFor('Ana', 'Leo', {}));
    for (const bad of [undefined, '', '1234', '+54 11 5555', 'abc']) {
      expect((await env.client().post(`/api/public/${slug}/contributions`, gift(`mal${String(bad).length}`, { giverPhone: bad }))).body.error).toBe('invalid_giver_phone');
    }
    const r = await env.client().post(`/api/public/${slug}/contributions`, gift('bien'));
    expect(r.status).toBe(201);
    const list = (await c.get('/api/contributions')).body.contributions;
    expect(list[0]).toMatchObject({ giverPhone: '5491155554444', thankedAt: null });
  });

  it('regalo grupal: guarda de parte de quiénes (hasta 120 caracteres); sin grupo queda vacío', async () => {
    const c = env.client(); await signUp(c, 'grupal@correo.com');
    const { slug } = await publishWith(c, draftFor('Gala', 'Pablo'));
    expect((await env.client().post(`/api/public/${slug}/contributions`, gift('grupo-largo', { groupNames: 'x'.repeat(121) }))).body.error).toBe('invalid_group_names');
    expect((await env.client().post(`/api/public/${slug}/contributions`, gift('grupo', { groupNames: '  Los   primos Díaz ' }))).status).toBe(201);
    expect((await env.client().post(`/api/public/${slug}/contributions`, gift('solo'))).status).toBe(201);
    const list = (await c.get('/api/contributions')).body.contributions as { groupNames: string }[];
    expect(list.map(x => x.groupNames).sort()).toEqual(['', 'Los primos Díaz']);
    expect(JSON.stringify((await env.client().get(`/api/public/${slug}`)).body)).not.toContain('primos');
  });

  it('CA-4: «Agradecer» marca el aporte una sola vez y solo para su dueña', async () => {
    const c = env.client(); await signUp(c, 'gracias@correo.com');
    const { slug } = await publishWith(c, draftFor('Fina', 'Juan'));
    const id = (await env.client().post(`/api/public/${slug}/contributions`, gift('gracias'))).body.id as string;
    const otra = env.client(); await signUp(otra, 'otra-wa@correo.com');
    expect((await otra.post(`/api/contributions/${id}/thanked`)).status).toBe(404);
    const first = await c.post(`/api/contributions/${id}/thanked`);
    expect(first.status).toBe(200);
    const again = await c.post(`/api/contributions/${id}/thanked`);
    expect(again.body.thankedAt).toBe(first.body.thankedAt);
    expect((await c.get('/api/contributions')).body.contributions[0].thankedAt).toBe(first.body.thankedAt);
  });

  it('CA-5: ningún WhatsApp llega a la página publicada', async () => {
    const c = env.client(); await signUp(c, 'privado@correo.com');
    const d = draftFor('Vera', 'Iván');
    const { slug } = await publishWith(c, { ...d, couple: { ...d.couple, whatsapp: '5493514445566' } });
    expect((await c.get('/api/wedding')).body.draft.couple.whatsapp).toBe('5493514445566');
    await env.client().post(`/api/public/${slug}/contributions`, gift('privado'));
    const pub = JSON.stringify((await env.client().get(`/api/public/${slug}`)).body);
    expect(pub).not.toContain('5493514445566');
    expect(pub).not.toContain('5491155554444');
  });
});
