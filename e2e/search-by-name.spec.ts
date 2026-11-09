// LAN-08 · Buscar un casamiento por el nombre de los novios: se publica uno, se lo busca desde /encontrar y se entra a su sitio.
import { expect, test } from './helpers';

const PASS = 'Clave1234';

test('se busca a los novios por su nombre y se entra a su sitio; sin resultados lo dice; un link pegado sigue andando', async ({ page }) => {
  const tag = Math.random().toString(36).slice(2, 7);
  const first = `Quimey${tag}`;
  const api = page.request;
  expect((await api.post('/api/auth/register', { data: { email: `busqueda-${tag}@example.com`, password: PASS } })).status()).toBe(201);
  let w = await (await api.get('/api/wedding')).json();
  const draft = { ...w.draft, onboarded: true, couple: { first, second: 'Bruno' }, date: '2027-05-08', planId: 'invitacion',
    gifts: { ...w.draft.gifts, items: [{ id: 'g1', name: 'Cena', text: '', amount: 100000, category: 'Luna de miel', icon: 'compass' }] } };
  expect((await api.put('/api/wedding', { data: { baseRevision: w.revision, draft } })).status()).toBe(200);
  w = await (await api.get('/api/wedding')).json();
  expect((await api.post('/api/wedding/payout', { data: { alias: `quimey.${tag}`, currentPassword: '', baseVersion: w.payout.version } })).status()).toBe(200);
  const pub = await api.post('/api/wedding/publish');
  expect(pub.status()).toBe(200);
  const slug = (await pub.json()).slug as string;
  await page.context().clearCookies();

  await page.goto('/encontrar', { waitUntil: 'networkidle' });
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  // Sin tilde ni mayúsculas.
  await page.getByLabel('Nombres de los novios').fill(first.toLowerCase());
  await page.getByRole('button', { name: 'Buscar' }).click();
  const result = page.getByRole('link', { name: new RegExp(`${first} y Bruno`) });
  await expect(result).toBeVisible();
  await result.click();
  await page.waitForURL(new RegExp(`/sitio/${slug}`));
  // Se espera a que el sitio esté a la vista: si se sale mientras carga, sus pedidos se cortan y quedan errores en la consola.
  await expect(page.getByRole('heading', { name: new RegExp(first) }).first()).toBeVisible();
  await page.waitForLoadState('networkidle');

  await page.goto('/encontrar', { waitUntil: 'networkidle' });
  await page.getByLabel('Nombres de los novios').fill(`Nadie${tag}`);
  await page.getByRole('button', { name: 'Buscar' }).click();
  await expect(page.getByRole('status')).toContainText('No encontramos ningún casamiento');

  await page.getByLabel('Nombres de los novios').fill(`weda.app/sitio/${slug}`);
  await page.getByRole('button', { name: 'Buscar' }).click();
  await page.waitForURL(new RegExp(`/sitio/${slug}`));
  await expect(page.getByRole('heading', { name: new RegExp(first) }).first()).toBeVisible();
  await page.waitForLoadState('networkidle');
});
