// GIFT-15 / ONB-06 · WhatsApp (specs/GIFT-15-whatsapp-y-agradecer/spec.md), en el celular: el alta pide el WhatsApp y la fecha,
// quien regala deja su WhatsApp y la pareja le agradece con un toque.
import { expect, publishCelebration, test } from './helpers';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const shot = async (page: import('@playwright/test').Page, name: string) => { if (process.env['SHOTS']) await page.screenshot({ path: `${process.env['SHOTS']}/wa-${name}.png` }); };

test('WhatsApp: el alta lo pide (y la fecha), quien regala lo deja y la pareja le agradece', async ({ page, context }) => {
  test.setTimeout(150_000);
  await page.goto('/crear/cuenta', { waitUntil: 'networkidle' });
  await page.fill('#ac-email', 'wa@example.com');
  await page.fill('#ac-pass', 'Clave1234');
  await page.getByRole('button', { name: 'Registrarme', exact: true }).click();
  await page.waitForURL(/\/crear$/);
  // CA-1: sin WhatsApp no se sigue.
  await page.fill('#on-first', 'Ana');
  await page.fill('#on-second', 'Leo');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('Escribí tu WhatsApp.')).toBeVisible();
  await expect(page).toHaveURL(/\/crear$/);
  await page.fill('#on-phone', '011 15 5555-4444');
  await shot(page, '1-alta');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.waitForURL(/\/crear\/fecha/);
  await expect(page.getByLabel('Todavía no la sabemos')).toBeVisible();   // la pantalla nueva ya está (la URL cambia antes)
  // CA-2: sin fecha no se sigue, salvo «Todavía no la sabemos».
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText(/Elegí la fecha o marcá «Todavía no la sabemos»/)).toBeVisible();
  await shot(page, '2-fecha');
  await page.getByLabel('Todavía no la sabemos').check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.waitForURL(/\/crear\/foto/);
  await page.getByRole('button', { name: 'Omitir por ahora' }).click();
  await page.waitForURL(/\/panel/);
  await expect.poll(async () => (await (await page.request.get('/api/wedding')).json()).draft.couple.whatsapp, { timeout: 15_000 }).toBe('5491155554444');
  await expect(page.getByText('Sumá tu WhatsApp.')).toHaveCount(0);

  // Publicada con un regalo y alias.
  await page.goto('/panel/regalos', { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Catálogo' }).click();
  await page.getByRole('button', { name: 'Regalos individuales' }).click();
  await page.getByRole('button', { name: 'Agregar Excursión en barco a tu lista' }).click();
  // La primera vez pregunta la moneda: el ayudante elige «Pesos» antes de esta comprobación.
  await expect(page.getByRole('button', { name: 'Quitar Excursión en barco de tu lista' })).toBeVisible();
  await expect.poll(async () => (await (await page.request.get('/api/wedding')).json()).draft.gifts.items.length, { timeout: 15_000 }).toBe(1);
  await page.waitForTimeout(1500);
  const slug = await publishCelebration(page);
  const w = await (await page.request.get('/api/wedding')).json();
  expect((await page.request.post('/api/wedding/payout', { data: { baseVersion: w.payout.version, alias: 'ana.leo.mp', bank: '', cbu: '' } })).status()).toBe(200);
  expect((await page.request.post('/api/wedding/publish')).status()).toBe(200);

  // CA-3: quien regala no puede enviar sin WhatsApp.
  const guest = await context.newPage();
  await guest.goto(`/sitio/${slug}/regalos`, { waitUntil: 'networkidle' });
  await guest.getByRole('button', { name: 'Regalar' }).first().click();
  const dlg = guest.getByRole('dialog');
  await dlg.getByRole('button', { name: 'Continuar' }).click();
  await dlg.locator('#rg-name').fill('Nora');
  await dlg.locator('#rg-surname').fill('Díaz');
  await dlg.locator('#rg-email').fill('nora@example.com');
  await dlg.locator('#rg-proof').setInputFiles({ name: 'comprobante.png', mimeType: 'image/png', buffer: PNG });
  await expect(dlg).toContainText('tu WhatsApp');
  await dlg.locator('#rg-phone').fill('11 6666 7777');
  await dlg.locator('#rg-phone').scrollIntoViewIfNeeded();
  await shot(guest, '3-regalar');
  await dlg.getByRole('button', { name: 'Enviar', exact: true }).click();
  await expect(dlg.getByRole('heading', { name: /¡Gracias, Nora!/ })).toBeVisible();

  // CA-4: la pareja le agradece por WhatsApp con el mensaje listo; queda «Agradecido».
  await page.goto('/panel/regalos', { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: /Aportes/ }).click();
  const thank = page.getByRole('link', { name: /Agradecer por WhatsApp/ });
  await expect(thank).toBeVisible();
  const href = new URL((await thank.getAttribute('href'))!);
  expect(href.pathname).toBe('/5491166667777');
  expect(href.searchParams.get('text')).toBe('¡Hola, Nora! Muchas gracias por regalarnos Excursión en barco. Nos hizo muy felices. Ana y Leo');
  await shot(page, '4-agradecer');
  await context.route('https://wa.me/**', r => r.fulfill({ status: 200, body: 'wa' }));
  const [popup] = await Promise.all([page.waitForEvent('popup'), thank.click()]);
  await popup.close();
  await expect(page.getByText('Agradecido')).toBeVisible();
  await expect.poll(async () => (await (await page.request.get('/api/contributions')).json()).contributions[0].thankedAt).not.toBeNull();
  await shot(page, '5-agradecido');
});
