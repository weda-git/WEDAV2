# ADM-01 · Administración de cuentas — plan técnico

- **Spec:** [spec.md](spec.md)
- **Estado:** aprobado (2026-11-21, por la dueña, con el esquema)
- **Rama:** `feat/admin-cuentas` desde `main`

## Enfoque
Una superficie nueva, `/admin`, servida por rutas nuevas `/api/admin/*` dentro del mismo servidor. No hay roles en la base: es administradora la sesión cuyo correo coincide con `WEDA_ADMIN_EMAIL` (variable de entorno, D1). Todo lo demás reutiliza lo que ya existe: publicar y despublicar, el enlace de «Olvidé mi clave», el panel de la pareja y el buzón de correos.

## Base de datos
Una migración nueva al final de `PG_MIGRATIONS` (`src/server/pg.ts`), solo agregado. **Requiere aprobación de esquema.**

```sql
-- Suspensión de una cuenta (D2). Sin fila = activa. No borra nada: reactivar borra solo esta fila.
CREATE TABLE account_suspensions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  suspended_at TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT ''
);
-- «Entrar como» (D5): una fila por vez que se entra; el token solo se guarda como hash.
CREATE TABLE admin_impersonations (
  id TEXT PRIMARY KEY,
  admin_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  started_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,          -- started_at + 30 minutos
  ended_at TEXT
);
-- Registro de acciones (D6). Sin claves foráneas, para que sobreviva a cualquier borrado futuro; un disparador impide UPDATE y DELETE.
CREATE TABLE admin_actions (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL,
  admin_id UUID NOT NULL,
  target_user_id UUID,
  action TEXT NOT NULL,              -- view, suspend, reactivate, unpublish, republish, change_email, send_reset, impersonate_start, impersonate_end, impersonated_save
  detail TEXT NOT NULL DEFAULT '{}'  -- JSON sin datos de invitados ni claves
);
CREATE INDEX admin_actions_target ON admin_actions(target_user_id, at);
-- + función y disparador BEFORE UPDATE OR DELETE ON admin_actions que lanza excepción
-- + ENABLE ROW LEVEL SECURITY en las tres tablas (como el resto)
```

Ninguna acción borra filas de las tablas existentes (CA-5).

## Servidor
- **`config.ts`:** `adminEmail` desde `WEDA_ADMIN_EMAIL` (opcional; sin ella, la administración no existe y `/api/admin/*` responde 404).
- **`accounts.ts`:** tres métodos nuevos en `Accounts` (y en `TaggedAccounts` de las pruebas):
  - `setBanned(userId, banned)`: `auth.admin.updateUserById` con `ban_duration` (Supabase deja de aceptar el ingreso y la renovación del token).
  - `setEmail(userId, email)`: `updateUserById({ email, email_confirm: true })`; correo repetido → 409 `email_taken`.
  - `emailOf(userId)`: lee `auth.users`.
- **`service.ts`, nuevo `admin.ts`** (clase `AdminService`, para no agrandar más `service.ts`):
  - `requireAdmin(session)`: compara el correo de la sesión con `adminEmail`; si no coincide, 404 `not_found` (CA-1).
  - `listAccounts(q)`: `auth.users` + `weddings` + `publications` + `account_suspensions`, con búsqueda por correo o nombres; páginas de 50 (CA-2).
  - `accountDetail(userId)`: lo mismo que ve la pareja en el panel (borrador, invitados, regalos, aportes), solo lectura, y registra `view` (CA-3).
  - `suspend` / `reactivate`: fila en `account_suspensions`, `setBanned`, cierre de sesiones (`DELETE FROM auth.sessions`), correo de aviso (CA-4, CA-11).
  - `unpublish` / `republish`: reutilizan `Service.unpublish` y `Service.publish` con el `userId` de la pareja (CA-6).
  - `changeEmail`: `setEmail` + correos de aviso al anterior y al nuevo (CA-7).
  - `sendReset`: el mismo camino interno que `requestPasswordReset` (CA-8).
  - `startImpersonation` / `endImpersonation` (CA-9).
  - Cada método escribe en `admin_actions` en la misma transacción (CA-10).
- **Suspensión en los caminos existentes:**
  - `login`: si la cuenta está suspendida → 403 `account_suspended`, con texto claro en `remote.ts`.
  - `authenticate`: una sesión de una cuenta suspendida no vale (por si quedara alguna).
  - `livePublication`: un sitio de una cuenta suspendida responde 410 `site_unavailable` (no cambia su estado de publicación, así reactivar lo devuelve tal cual).
- **«Entrar como» en `api.ts`:**
  - Cookie aparte `weda_as` (httpOnly, SameSite=Strict, 30 minutos) con un token al azar; en la base solo su hash.
  - Al resolver la sesión: si la sesión es de la administradora y `weda_as` es válido y no venció, el `userId` efectivo es el de la pareja y la sesión lleva `impersonating`.
  - Con `impersonating`, responden 403 `not_allowed_as_admin`: datos de cobro, cambiar clave, cerrar otras sesiones, órdenes, checkout y pagos de prueba (CA-9).
  - Cada guardado del panel hecho así registra `impersonated_save`.
  - `/api/me` devuelve `impersonating: { email, expiresAt }` para la franja.

## Interfaz
- **Rutas nuevas** `src/routes/admin.index.tsx` (lista y búsqueda) y `src/routes/admin.$userId.tsx` (detalle), con `noindex` y los estilos del panel. Sin sesión de administradora se ve la página 404 de siempre.
- **Detalle:** datos de la cuenta, estado, plan y publicación; pestañas de solo lectura (invitados, regalos, aportes); botones «Suspender» / «Reactivar», «Despublicar» / «Republicar», «Cambiar correo», «Mandar enlace de clave» y «Entrar como»; abajo, su registro de acciones. Suspender y cambiar correo piden confirmación con un diálogo.
- **Franja de «entrar como»:** componente fijo arriba del panel, «Estás viendo la cuenta de X · Salir», con el tiempo que queda; al vencer vuelve a `/admin/$userId`.
- **Mensajes nuevos:** `account_suspended` en el ingreso y «Esta página no está disponible» en el sitio público.

## Riesgos
- **Acceso de la administradora:** quien entre a su cuenta controla todas. Sin segundo factor en esta etapa (pregunta abierta de la spec); se mitiga con clave fuerte y sesión normal.
- **«Entrar como» mal cerrado:** se mitiga con cookie aparte, vencimiento en el servidor, rutas sensibles bloqueadas y pruebas de cada una.
- **Divergencia entre el bloqueo de Supabase y la tabla:** si falla `setBanned`, la acción se deshace y no se registra.

## Pruebas
- **Servidor** (`src/test/server/admin.test.ts`): CA-1 (tres tipos de sesión), CA-2, CA-3, CA-4 y CA-5 (conteo de filas antes y después), CA-6, CA-7, CA-8, CA-9 (cada ruta bloqueada y el vencimiento), CA-10, CA-11 (buzón simulado).
- **Navegador** (`e2e/admin.spec.ts`): recorrido de lista, detalle, suspender y reactivar, y entrar como con la franja, en compu y celular.
- Las existentes de ingreso, publicación y sitio público tienen que seguir pasando.

## Documentación a actualizar
- `01-feature-inventory.md`: ADM-01 parcial (soporte y registro).
- `02-business-rules-catalog.md`: estado de BR-46.
- `03-open-decisions-and-risks.md`: riesgo del segundo factor.
- `.env.example`: `WEDA_ADMIN_EMAIL`.
- `docs/ux-flows.md`: la administración.
