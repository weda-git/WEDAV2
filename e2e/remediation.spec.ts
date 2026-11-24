import { expect, fillNamesAndContinue, test } from './helpers';

/* Remediación post-auditoría (2026-10-29): recuperar la clave, páginas legales, «Por qué Weda» y el envío antes de hidratar. */

test.describe('Recuperar la clave', () => {
  test('desde «Ingresar» se pide el enlace: sin cuenta se avisa y no se manda; con cuenta, «Revisá tu correo» (2026-11-20)', async ({ page, consoleErrors }) => {
    await page.goto('/crear/cuenta?modo=ingresar', { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: '¿Olvidaste tu clave?' }).click();
    await expect(page).toHaveURL(/\/clave$/);
    await page.getByLabel('Correo electrónico').fill('no-es-correo');
    await page.getByRole('button', { name: 'Mandarme el enlace' }).click();
    await expect(page.getByText('Ingresá un correo válido')).toBeVisible();
    await page.getByLabel('Correo electrónico').fill('cualquiera@example.com');
    await page.getByRole('button', { name: 'Mandarme el enlace' }).click();
    await expect(page.getByText('No hay ninguna cuenta con ese correo')).toBeVisible();
    // El 404 del servidor (cuenta inexistente) es la respuesta esperada: el navegador lo anota en la consola. Solo ese se descarta.
    const rest = consoleErrors.filter(e => !/status of 404/.test(e));
    consoleErrors.splice(0, consoleErrors.length, ...rest);
    // Con cuenta: se crea desde la página (así pasa por el mismo sufijo único de correo que el formulario) y se pide el enlace con ese correo.
    expect(await page.evaluate(async () => {
      const r = await fetch('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'olvido-e2e@example.com', password: 'Clave1234' }) });
      await fetch('/api/auth/logout', { method: 'POST' });
      return r.status;
    })).toBe(201);
    await page.getByLabel('Correo electrónico').fill('olvido-e2e@example.com');
    await page.getByRole('button', { name: 'Mandarme el enlace' }).click();
    await expect(page.locator('.fg-note')).toContainText('Revisá tu correo');
    await expect(page.locator('.fg-note')).toContainText('te va a llegar un correo con el enlace');
    await expect(page.getByText(/Si hay una cuenta/)).toHaveCount(0);
  });

  test('un enlace incompleto o vencido lo explica y ofrece pedir otro', async ({ page, consoleErrors }) => {
    await page.goto('/clave/nueva', { waitUntil: 'networkidle' });
    await expect(page.getByText('Este enlace está incompleto')).toBeVisible();
    await page.goto('/clave/nueva?token=inventado-de-mas-de-veinte-caracteres', { waitUntil: 'networkidle' });
    await page.getByLabel('Clave nueva', { exact: true }).fill('Nueva-clave-2026');
    await page.getByLabel('Repetila').fill('Otra-cosa-2026');
    await page.getByRole('button', { name: 'Cambiar la clave' }).click();
    await expect(page.getByText('Las dos claves tienen que ser iguales.')).toBeVisible();
    await page.getByLabel('Repetila').fill('Nueva-clave-2026');
    await page.getByRole('button', { name: 'Cambiar la clave' }).click();
    await expect(page.getByRole('alert')).toContainText('El enlace venció o ya se usó');
    await expect(page.getByRole('link', { name: 'Pedir otro enlace' })).toBeVisible();
    // El 400 del servidor (token inválido) es la respuesta esperada: el navegador lo anota en la consola. Solo ese se descarta.
    const rest = consoleErrors.filter(e => !/status of 400/.test(e));
    consoleErrors.splice(0, consoleErrors.length, ...rest);
  });
});

test.describe('Contenido legal y comercial', () => {
  test('términos y privacidad existen, se enlazan desde el registro y el pie, y no se indexan', async ({ page }) => {
    await page.goto('/crear/cuenta', { waitUntil: 'networkidle' });
    await expect(page.getByRole('link', { name: 'Términos de uso' })).toHaveAttribute('href', '/terminos');
    await expect(page.getByRole('link', { name: 'Política de privacidad' })).toHaveAttribute('href', '/privacidad');
    for (const path of ['/terminos', '/privacidad']) {
      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      await expect(page.locator('mark.legal-todo').first()).toBeVisible();             // borrador: lo pendiente se ve marcado
    }
    await page.goto('/', { waitUntil: 'load' });
    await expect(page.locator('.seed-footer').getByRole('link', { name: 'Términos y condiciones' })).toHaveAttribute('href', '/terminos');
    await expect(page.locator('.seed-footer').getByRole('link', { name: 'hola@weda.app' })).toHaveAttribute('href', 'mailto:hola@weda.app');
  });
});

test.describe('Envío antes de hidratar', () => {
  test('tocar «Continuar» antes de que la página esté activa no recarga ni pierde lo escrito', async ({ page }) => {
    // Registro y nombres normales; en la pantalla de la fecha se demora el JavaScript para tocar antes de hidratar.
    await page.goto('/crear/cuenta', { waitUntil: 'networkidle' });
    await page.fill('#ac-email', 'hidrata@example.com');
    await page.fill('#ac-pass', 'Clave1234');
    await page.getByRole('button', { name: 'Registrarme', exact: true }).click();
    await page.waitForURL(/\/crear$/);
    await fillNamesAndContinue(page, 'Ana', 'Leo');
    let release!: () => void;
    const gate = new Promise<void>(r => { release = r; });
    await page.route(/\.(m?js)(\?.*)?$/, async route => { await gate; await route.continue().catch(() => undefined); });
    let reloads = 0;
    page.on('framenavigated', f => { if (f === page.mainFrame()) reloads++; });
    await page.goto('/crear/fecha', { waitUntil: 'domcontentloaded' });
    reloads = 0;
    const next = page.getByRole('button', { name: 'Continuar' });
    await expect(next).toBeDisabled();                                                  // no parece roto: está deshabilitado
    await next.click({ force: true });                                                  // aun forzado, no hace un envío nativo
    await page.waitForTimeout(500);
    expect(reloads).toBe(0);
    release();                                                                          // el JavaScript llega: la página se activa
    await expect(page.locator('html')).toHaveAttribute('data-hydrated', '');
    await expect(next).toBeEnabled();
    await page.getByLabel('Todavía no la sabemos').check();                           // ONB-06: la fecha es obligatoria salvo esta opción
    await next.click();
    await page.waitForURL(/\/crear\/foto/);
  });
});
