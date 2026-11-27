import { expect, nav, onboard, test } from '../helpers';

/* Constructor «Tu página» en compu (1024, 1280 y 1440 px). Rediseño del 2026-11-25: una sola columna, sin vista previa dentro del editor.
   Cada sección muestra su ícono, qué trae, su estado y su lugar; «Ver mi página» abre la vista previa completa. */

for (const width of [1024, 1280, 1440]) {
  test.describe(`Constructor en compu a ${width} px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: 860 });
      await onboard(page);
      await nav(page, 'Tu sitio').click();
      await expect(page.getByRole('heading', { name: 'Tus secciones', exact: true })).toBeVisible();
    });

    test('una columna legible: secciones con su estado, «Sumá más secciones» con qué trae cada una y sin scroll lateral', async ({ page }) => {
      await expect(page.locator('.ed-view')).toHaveCount(0);
      const side = (await page.locator('.ed-side').boundingBox())!;
      expect(side.width).toBeGreaterThanOrEqual(600);
      await expect(page.getByRole('button', { name: /^Editar Eventos/ })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Agregar Dress code a tu sitio' })).toContainText('Cómo vestirse');
      await expect(page.getByRole('heading', { name: 'Sumá más secciones' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Ver mi sitio' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    });

    test('al editar, la barra dice qué sección es y «Listo» queda a la vista con el formulario largo', async ({ page }) => {
      await page.getByRole('button', { name: /^Editar Eventos/ }).click();
      await expect(page.locator('.ed-place')).toContainText('Eventos');
      if ((await page.locator('#sec-ceremonia').getAttribute('aria-expanded')) !== 'true') await page.locator('#sec-ceremonia').click();
      await page.getByRole('button', { name: 'Listo', exact: true }).scrollIntoViewIfNeeded();
      const d = (await page.getByRole('button', { name: 'Listo', exact: true }).boundingBox())!;
      expect(d.y).toBeGreaterThanOrEqual(0);
      expect(d.y + d.height).toBeLessThanOrEqual(860);
      await page.getByRole('button', { name: 'Volver a Tu sitio' }).click();
      await expect(page.getByRole('heading', { name: 'Tus secciones', exact: true })).toBeVisible();
    });
  });
}

test('pasar de celular a compu con una sección abierta la mantiene abierta', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await onboard(page);
  await nav(page, 'Tu sitio').click();
  await page.getByRole('button', { name: /^Editar Confirmación/ }).click();
  await expect(page.locator('.ed-place')).toContainText('Confirmación');
  await page.setViewportSize({ width: 1280, height: 860 });
  await expect(page.getByRole('heading', { name: 'Confirmación de asistencia' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Confirmación de asistencia' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Volver a Tu sitio' })).toBeVisible();
});
