// GIFT-10 v2 · Moneda de la lista (specs/GIFT-10-moneda-de-la-lista/spec.md), en el celular: la pareja elige la moneda al agregar el
// primer regalo, ve los dos precios, carga una cuenta por moneda y el invitado elige en qué moneda regalar.
import { expect, onboard, publishCelebration, test } from './helpers';

test.use({ autoCurrency: false });
const shot = async (page: import('@playwright/test').Page, name: string) => { if (process.env['SHOTS']) await page.screenshot({ path: `${process.env['SHOTS']}/${name}.png` }); };

test('pesos y dólares: elegir al empezar, los dos precios, una cuenta por moneda y el invitado elige', async ({ page, context }) => {
  test.setTimeout(150_000);
  await onboard(page, 'Ana', 'Leo');
  await page.goto('/panel/regalos', { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Catálogo' }).click();
  await page.getByRole('button', { name: 'Regalos individuales' }).click();
  // CA-1: el primer regalo pregunta la moneda; el regalo se agrega apenas se elige.
  await page.getByRole('button', { name: 'Agregar Excursión en barco a tu lista' }).click();
  const ask = page.getByRole('dialog', { name: '¿En qué moneda armás tu lista?' });
  await expect(ask).toBeVisible();
  await shot(page, '1-elegir');
  await ask.getByRole('radio', { name: /^Las dos/ }).click();
  await expect(ask).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Quitar Excursión en barco de tu lista' })).toBeVisible();
  // CA-2, CA-3: en la lista, los dos precios; el segundo regalo ya no pregunta.
  await page.getByRole('button', { name: 'Agregar Cena frente al mar a tu lista' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('tab', { name: /Mis regalos/ }).click();
  const card = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Excursión en barco' }) });
  await expect(card).toContainText('$ 250.000');
  await expect(card).toContainText('US$ 170');
  await shot(page, '2-lista');
  // Cambiar: el chip abre el mismo selector, con la moneda actual.
  await page.getByRole('button', { name: /Moneda de tu lista: Pesos y dólares/ }).click();
  await expect(page.getByRole('dialog', { name: 'Moneda de tu lista' })).toContainText('Moneda actual');
  await page.waitForTimeout(500);
  await shot(page, '3-cambiar');
  await page.keyboard.press('Escape');
  // Regalo propio con «Las dos»: el otro monto se completa redondeado.
  await page.getByRole('button', { name: 'Crear regalo' }).first().click();
  const form = page.getByRole('dialog', { name: 'Crear un regalo propio' });
  await form.getByLabel('Monto en pesos').fill('100000');
  await expect(form.getByLabel('Monto en dólares')).toHaveValue('70');
  await shot(page, '4-propio');
  await form.getByLabel('Nombre del regalo').fill('Auriculares');
  await form.getByRole('button', { name: 'Agregar a mi lista' }).click();
  // CA-6: una pestaña de cuenta por moneda.
  await page.getByRole('tab', { name: /Cobro/ }).click();
  await expect(page.getByRole('tab', { name: /Cuenta en pesos/ })).toBeVisible();
  await page.getByRole('tab', { name: /Cuenta en dólares/ }).click();
  await expect(page.getByRole('heading', { name: 'Transferencia en dólares' })).toBeVisible();
  await shot(page, '5-cobro');

  // Publicada y con las dos cuentas (la primera carga no pide clave), el invitado elige la moneda.
  // Esperar a que el panel termine de guardar (si no, publicar choca con su último guardado).
  await expect.poll(async () => (await (await page.request.get('/api/wedding')).json()).draft.gifts.items.length, { timeout: 15_000 }).toBe(3);
  await page.waitForTimeout(1500);
  const slug = await publishCelebration(page);
  for (const [currency, alias] of [['ARS', 'ana.leo.pesos'], ['USD', 'ana.leo.usd']] as const) {
    const w = await (await page.request.get('/api/wedding')).json();
    const base = currency === 'USD' ? w.payoutUsd.version : w.payout.version;
    expect((await page.request.post('/api/wedding/payout', { data: { currency, baseVersion: base, alias, bank: '', cbu: '' } })).status()).toBe(200);
  }
  expect((await page.request.post('/api/wedding/publish')).status()).toBe(200);
  const guest = await context.newPage();
  await guest.goto(`/sitio/${slug}/regalos`, { waitUntil: 'networkidle' });
  // Al entrar, se pregunta la moneda (2026-11-24); después queda como filtro (AR$ / US$).
  const guestAsk = guest.getByRole('dialog', { name: '¿En qué moneda querés ver los precios?' });
  await expect(guestAsk).toBeVisible();
  await guest.waitForTimeout(400);
  await shot(guest, '6a-preguntar');
  await guestAsk.getByRole('button', { name: /Pesos/ }).click();
  await expect(guestAsk).toHaveCount(0);
  const gift = guest.locator('article').filter({ hasText: 'Excursión en barco' });
  await expect(gift).toContainText('$ 250.000');
  const pick = guest.getByRole('radiogroup', { name: 'Moneda de los precios' }).filter({ visible: true });
  await pick.getByRole('radio', { name: 'Dólares' }).click();
  await expect(gift).toContainText('US$ 170');
  await guest.waitForTimeout(300);
  await shot(guest, '6-invitado');
  if (process.env['SHOTS']) { await guest.setViewportSize({ width: 1280, height: 800 }); await guest.locator('#regalos').scrollIntoViewIfNeeded(); await guest.waitForTimeout(400); await shot(guest, '6-compu'); await guest.setViewportSize({ width: 390, height: 844 }); }
  // Recargar no vuelve a preguntar: recuerda lo elegido en esta pestaña.
  await guest.reload({ waitUntil: 'networkidle' });
  await expect(gift).toContainText('US$ 170');
  await expect(guestAsk).toHaveCount(0);
  await gift.getByRole('button', { name: 'Regalar' }).click();
  const dlg = guest.getByRole('dialog');
  await expect(dlg).toContainText('US$ 170');
  await dlg.getByRole('button', { name: 'Continuar' }).click();
  // D4: transfiere a la cuenta de la moneda que eligió.
  await expect(dlg).toContainText('ana.leo.usd');
  await expect(dlg).not.toContainText('ana.leo.pesos');
  await shot(guest, '7-regalar');
});
