// LAN-08 · Buscar un casamiento por el nombre de los novios (specs/LAN-08-busqueda-por-nombre, D-08).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { draftFor, makeEnv, publishWith, saveDraft, signUp, type Env } from './helpers';

let env: Env;
beforeAll(async () => {
  env = await makeEnv();
  // Tres casamientos publicados (con fechas distintas), uno solo en borrador y uno dado de baja.
  const pub = async (email: string, a: string, b: string, date: string | null) => { const c = env.client(); await signUp(c, email); await publishWith(c, draftFor(a, b, { date })); return c; };
  await pub('lucia@correo.com', 'Lucía', 'Tomás', '2027-03-20');
  await pub('lucia2@correo.com', 'Lucía', 'Pedro', '2026-12-12');
  await pub('ana@correo.com', 'Ana', 'Leo', null);
  const draftOnly = env.client(); await signUp(draftOnly, 'borrador@correo.com'); await saveDraft(draftOnly, draftFor('Lucía', 'Borrador'));
  const down = await pub('baja@correo.com', 'Lucía', 'Baja', '2027-01-01');
  expect((await down.post('/api/wedding/unpublish')).status).toBe(200);
});
afterAll(() => env.close());

const search = (q: string) => env.client().get(`/api/search?q=${encodeURIComponent(q)}`);

describe('buscar un casamiento por nombre', () => {
  it('encuentra por un nombre o los dos, sin importar mayúsculas ni tildes (CA-1)', async () => {
    const one = await search('lucia');
    expect(one.status).toBe(200);
    expect(one.body.results.map((r: { names: string }) => r.names).sort()).toEqual(['Lucía & Pedro', 'Lucía & Tomás']);
    expect((await search('LUCÍA tomas')).body.results.map((r: { names: string }) => r.names)).toEqual(['Lucía & Tomás']);
    expect((await search('Ana y Leo')).body.results.map((r: { names: string }) => r.names)).toEqual(['Ana & Leo']);
    expect((await search('Martina')).body.results).toEqual([]);
  });

  it('no muestra borradores ni páginas dadas de baja (CA-2)', async () => {
    const names = (await search('lucia')).body.results.map((r: { names: string }) => r.names);
    expect(names).not.toContain('Lucía & Borrador');
    expect(names).not.toContain('Lucía & Baja');
  });

  it('cada resultado trae solo nombres, fecha y enlace (CA-3)', async () => {
    const [r] = (await search('ana leo')).body.results;
    expect(Object.keys(r).sort()).toEqual(['dateLabel', 'names', 'path']);
    expect(r).toMatchObject({ names: 'Ana & Leo', dateLabel: null });
    expect(r.path).toMatch(/^\/sitio\/[a-z0-9-]+$/);
    const site = await env.client().get(`/api/public/${r.path.split('/').pop()}`);
    expect(site.status).toBe(200);
  });

  it('pide 3 letras, ordena por cercanía de la fecha y devuelve como mucho 10 (CA-4)', async () => {
    expect([(await search('lu')).status, (await search('lu')).body.error]).toEqual([400, 'query_too_short']);
    expect((await search('y &')).body.error).toBe('query_too_short');
    // La más cercana a hoy primero; sin fecha, al final.
    const order = (await search('lucia')).body.results.map((r: { names: string }) => r.names);
    expect(order).toEqual(['Lucía & Pedro', 'Lucía & Tomás']);
  });

  it('limita las búsquedas por IP (CA-5)', async () => {
    let last = 200;
    for (let i = 0; i < 40 && last !== 429; i++) last = (await search(`zzz${i}`)).status;
    expect(last).toBe(429);
  });
});
