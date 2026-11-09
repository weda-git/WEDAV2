# LAN-08 · Buscar un casamiento por el nombre de los novios — plan

- **Spec:** [spec.md](spec.md) (aprobada 2026-11-08, dueña)

## Servidor
- `GET /api/search?q=…` (sin sesión). Ruta propia, fuera de `/api/public/<slug>`, para no chocar con un slug.
- `Service.searchPublic(q, ip)`:
  - `q` se normaliza con `norm` (minúsculas, sin tildes), se quitan `%` y `_`, se parte en palabras; menos de 3 letras en total → 400 `query_too_short`. Máximo 60 caracteres.
  - Límite por IP: 30 búsquedas cada 10 minutos (`RateLimiter`), 429 `too_many_requests`.
  - SQL sobre lo ya publicado, sin tablas ni índices nuevos: `publications.status = 'live'` unida a `weddings` (slug), y cada palabra debe estar en `snapshot.names` sin tildes (`translate(lower(...))`). Se traen hasta 50.
  - En el servidor se ordenan por cercanía de `snapshot.eventDate` a hoy (sin fecha al final) y se devuelven 10 con solo `{ names, dateLabel, path }`.
- Sin cambios de esquema.

## Interfaz (`src/routes/encontrar.tsx`)
- Un link pegado sigue abriendo la invitación (LAN-04).
- Si no, se llama a la búsqueda y se muestra la lista (nombres y fecha, cada uno enlazado al sitio) o «No encontramos ningún casamiento con "…"». Errores de red y 429 con su mensaje.

## Pruebas
- Servidor (`src/test/server/search.test.ts`): CA-1 a CA-5.
- Interfaz: E2E del recorrido (CA-6, CA-7) y `noindex` (CA-8).
