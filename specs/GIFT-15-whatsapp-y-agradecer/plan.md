# GIFT-15 / ONB-06 · WhatsApp — plan técnico

- **Spec:** [spec.md](spec.md), aprobada por la dueña el 2026-11-23, con D5 a D8 y la migración 5
- **Rama:** `feat/whatsapp`, sobre `feat/moneda-lista` (usa la migración 4 de GIFT-10 v2). Se mergea después del PR de GIFT-10.

## Base de datos
Migración 5, al final de `PG_MIGRATIONS` (`src/server/pg.ts`), solo agrega columnas:
```sql
ALTER TABLE contributions ADD COLUMN giver_phone TEXT NOT NULL DEFAULT '';
ALTER TABLE contributions ADD COLUMN thanked_at TEXT;
```
El WhatsApp de la pareja va en el borrador (`couple.whatsapp`, JSON): no cambia el esquema. `siteFromState` no lo lee, así que no llega a lo publicado.

## Datos y lógica
- **`src/lib/weda/phone.ts` (nuevo):**
  - `normalizePhone` (D6: formato internacional; en Argentina se agrega el 9 y se sacan el 0 y el 15);
  - `validatePhone`, `isStoredPhone`, `formatPhone`, `maskPhone` y `splitPhone`;
  - `waLink` y `thankMessage` (D5).
- **`types.ts` y `store.ts`:** `Couple.whatsapp`, que se guarda solo si es un número válido.
- **`logic.ts`:** `Contribution.phone` y `thankedAt`, que vienen del servidor.

## Servidor
- **`submitContribution`:** exige `giverPhone` válido (`invalid_giver_phone`) y lo guarda.
- **`listContributions`:** devuelve `giverPhone` y `thankedAt`.
- **`POST /api/contributions/:id/thanked`:** marca `thanked_at` la primera vez, solo en aportes de la propia pareja.
- **Administración:** muestra `whatsapp` de la pareja entero y el de quien regala enmascarado (D8).

## Interfaz
- **Alta:**
  - `crear.index`: `PhoneField`, obligatorio (D1);
  - `crear.fecha`: fecha obligatoria, con «Todavía no la sabemos» (D2).
- **Panel:**
  - «Datos del casamiento» (`couple-form`): WhatsApp editable;
  - inicio: el aviso «Sumá tu WhatsApp», que se puede cerrar (D7);
  - «Aportes recibidos»: número de quien regala, botón verde «Agradecer por WhatsApp» (un enlace a `wa.me`) y chip «Agradecido».
- **Invitación:** campo WhatsApp (país y número) en el formulario de regalo, obligatorio (D3).
- **Privacidad:** se suma el WhatsApp a los datos de parejas e invitados. Lo revisa el asesor (RK-08).

## Pruebas
- **Unitarias:** `src/test/whatsapp.test.ts` (formato, enlace, mensaje y que no se publica).
- **Servidor:**
  - `src/test/server/whatsapp.test.ts` (obligatorio, «Agradecido» y que no se publica);
  - `admin.test.ts` (enmascarado);
  - el resto de las pruebas de aportes manda `giverPhone`.
- **E2E:**
  - `e2e/whatsapp.spec.ts`: alta, regalo y agradecer, en celular;
  - los ayudantes del alta completan WhatsApp y fecha.
