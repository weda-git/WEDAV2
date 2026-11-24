# GIFT-10 · Moneda de la lista de regalos — plan técnico

- **Spec:** [spec.md](spec.md)
- **Estado:** aprobado (2026-11-23). **Actualizado para la v2** de la spec: ver «Cambios de la v2» al final; lo de abajo describe la v1 donde no se contradice.
- **Rama:** `feat/moneda-lista` desde `main`

## Enfoque
La moneda vive en el borrador de la pareja (`gifts.currency: 'ARS' | 'USD'`, por defecto `'ARS'`), viaja en la página publicada y se copia en cada aporte al llegar. Un único módulo de formato (`formatMoney(amount, currency)`) reemplaza a `formatARS` en todo lo que muestra importes de la lista. Ningún importe se convierte.

## Base de datos
Una migración nueva al final de `PG_MIGRATIONS` (`src/server/pg.ts`), solo agregado. **Requiere aprobación de esquema.**

```sql
-- Moneda de cada aporte, guardada al llegar (D9). Los existentes son pesos.
ALTER TABLE contributions ADD COLUMN currency TEXT NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS','USD'));
```

El borrador (`weddings.draft`) y la página publicada (`publications.snapshot`) son JSON: la moneda va adentro y no cambia su esquema. Un borrador sin `gifts.currency` se lee como `'ARS'` (`sanitizeDraft`).

## Datos y lógica (`src/lib/`)
- **`demo-wedding.ts`:** cada regalo del catálogo suma `amountUsd` (los precios que define la dueña). Las gift cards llevan los suyos.
- **`weda/types.ts`:** `gifts.currency` y, en cada regalo de la lista, `needsAmount?: true`, que marca un regalo propio que quedó sin monto al cambiar de moneda (D5).
- **`weda/money.ts` (nuevo):**
  - `formatMoney`: «$ 250.000» en pesos y «US$ 250» en dólares (D6);
  - `limitsFor(currency)`: los mínimos y máximos de D7;
  - `catalogPrice(gift, currency)`.
- **`weda/logic.ts`:**
  - `setListCurrency(state, currency)`: los regalos del catálogo toman su precio en la nueva moneda y los propios quedan con `needsAmount`;
  - `validateGift` y `validateFreeAmount` usan los límites de la moneda;
  - `addCatalogGift` y `addSet` usan el precio en la moneda de la lista.
- **`weda/journey.ts` y el diálogo de publicar:** un regalo con `needsAmount` es un pendiente que bloquea publicar, con su aviso (CA-5).

## Servidor
- **`draft.ts`:** `sanitizeDraft` acepta `currency` solo `'ARS' | 'USD'` y aplica los límites de esa moneda a cada regalo.
- **`service.ts`:**
  - `saveWedding`: si la moneda del borrador cambia y la boda ya tiene aportes, responde 409 `currency_locked` (CA-4);
  - `publicSite` lleva la moneda;
  - `submitContribution` valida importes con los límites de la moneda y guarda `currency` en el aporte (CA-7, CA-8);
  - `listContributions` devuelve la moneda de cada aporte;
  - los correos (comprobante, recordatorio) usan `formatMoney` con la moneda del aporte (CA-6).
- **Totales:** se calculan en el panel por moneda; con una moneda por lista habrá una sola, pero el código no suma monedas distintas (CA-7, CA-9).

## Interfaz
- **Regalos → Mis regalos:**
  - un selector «Pesos / Dólares» junto al encabezado;
  - con aportes queda deshabilitado, con el aviso «La moneda queda fija porque ya recibiste aportes»;
  - al cambiar, se confirma con un diálogo que dice cuántos regalos propios van a quedar sin monto.
- **Tarjetas, catálogo, packs, diálogo de crear o editar, aportes, invitación, ejemplo y admin:** todo con `formatMoney`. El campo dice «Monto en pesos» o «Monto en dólares».
- **Regalo sin monto:** la tarjeta muestra «Falta el monto» en el globito y abre su edición al tocarla.
- **Cobro:** con dólares, una línea aclara que la cuenta tiene que aceptar dólares (D8).

## Riesgos
- **Listas publicadas:** las que ya existen no tienen moneda en su página: se leen como pesos, igual que hoy. No hace falta republicarlas.
- **Doble envío de un aporte justo cuando la pareja cambia la moneda:** el servidor bloquea el cambio con aportes, y el aporte guarda la moneda de la página publicada que el invitado vio.
- **Cantidad de archivos tocados:** `formatARS` se usa en 8. Se reemplaza en todos y una prueba busca que no quede ninguno en lo que muestra importes de la lista.

## Pruebas
- **Unitarias:**
  - `money.ts` (formatos y límites);
  - `setListCurrency` (catálogo, propios y gift cards);
  - `validateGift` por moneda;
  - catálogo con `amountUsd` en todos los regalos.
- **Servidor:**
  - `currency_locked` con aportes;
  - un aporte en dólares guarda `USD` y usa los límites de dólares;
  - los aportes viejos quedan en `ARS`;
  - el correo muestra «US$».
- **Navegador (celular):**
  - cambiar a dólares y ver el catálogo y las tarjetas en «US$»;
  - un regalo propio queda sin monto y publicar lo avisa;
  - la invitación en dólares.

## Documentación a actualizar
- `01-feature-inventory.md`: GIFT-10.
- `02-business-rules-catalog.md`: BR-21.
- `03-open-decisions-and-risks.md`: RK-05 / IC-23, en parte.
- `docs/design-system.md`: el formato de los importes.


## Cambios de la v2 (2026-11-23)
- **Modelo:**
  - `gifts.currency` pasa a ser `'ARS' | 'USD' | 'both'`; sin dato, todavía no se eligió y se muestra en pesos.
  - Cada regalo de la lista guarda `amount` (pesos) y `amountUsd`.
  - Se eliminan `needsAmount`, `catalogPrice`, `setListCurrency` y `giftsMissingAmount`; entra `setListMode`.
- **`money.ts`:**
  - `usdFrom` (a la decena, para arriba) y `arsFrom` (al millar, para arriba), a `SUGGEST_RATE` = 1500;
  - `priceIn(g, currency)`, `shownCurrencies(mode)` y `currencyChosen`.
- **Catálogo:** los dólares se redondean a la decena para arriba.
- **Cuentas:**
  - la de pesos sigue en `gifts.alias/bank/cbu`; la de dólares va en `gifts.usd`. Las dos las pone el servidor desde `payout_methods`;
  - **migración 4:** `payout_methods.currency`. La cuenta vigente de cada moneda es su versión más alta, y la numeración de versiones sigue siendo una por casamiento;
  - `changePayout` recibe `currency`, y `GET /api/wedding` devuelve `payoutUsd`.
- **Aportes:**
  - el invitado manda `currency`, que tiene que estar entre `site.currencies`;
  - el monto sale de `priceIn` sobre lo publicado;
  - se quita el bloqueo `currency_locked`.
- **Publicar:** `hasPayout` pide la cuenta de cada moneda que muestra la lista.
- **Pruebas e2e:** una nueva (`e2e/currency.spec.ts`). En las demás, el selector de la primera vez elige «Pesos» solo (`autoCurrency` en `e2e/helpers.ts`).
