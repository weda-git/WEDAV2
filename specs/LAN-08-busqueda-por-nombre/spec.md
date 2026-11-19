# LAN-08 · Buscar un casamiento por el nombre de los novios — spec

- **Estado:** construida en la rama `rediseno` (2026-11-09); se cierra con el PR
- **Tamaño:** crítica (privacidad: hace encontrables los sitios publicados)
- **Plan:** [plan.md](plan.md)

## Problema
En `/encontrar` el invitado tiene que pegar el link que le mandaron (LAN-04). Muchos no lo tienen a mano. La dueña quiere que pueda buscar a la pareja por su nombre y entrar a su sitio.

## Reglas y decisiones que aplica

| ID | Dónde está | Estado | Qué toma de ahí esta funcionalidad |
|---|---|---|---|
| D-08 | `docs/product-blueprint/03-open-decisions-and-risks.md` §4 | DECIDIDO (2026-11-08, dueña) | Todos los casamientos publicados se pueden buscar por nombre, sin que la pareja tenga que activarlo |
| DP-16 | `03-open-decisions-and-risks.md` | PENDIENTE en lo que toca a buscadores (Google) | Los sitios siguen con `noindex`: esta búsqueda es solo dentro de Weda |
| BR-65 | `02-business-rules-catalog.md` | DECIDIDO | Lo publicado no vence: aparece mientras esté publicado |
| LAN-04 | `01-feature-inventory.md` | Implementada | `/encontrar` sigue aceptando un link pegado |

## Decisiones de la funcionalidad
- 2026-11-08, dueña: aparecen **todos los publicados**, sin opt-in (D-08).
- 2026-11-08, dueña: la pantalla se presenta como búsqueda por nombre; sin «¿No tenés el link?» ni el link al ejemplo, y con el logo sin globo sobre la foto.

## Criterios de aceptación
| # | Criterio | Regla | Cómo se verifica |
|---|---|---|---|
| CA-1 | Buscar por el nombre de uno o de los dos novios encuentra los casamientos **publicados** cuyo nombre lo contiene, sin importar mayúsculas ni tildes («lucia» encuentra «Lucía») | D-08 | Prueba de servidor |
| CA-2 | No aparecen borradores ni páginas dadas de baja: solo lo que hoy se puede abrir públicamente | BR-65, D-08 | Prueba de servidor |
| CA-3 | Cada resultado muestra solo lo que ya es público en el sitio: los nombres, la fecha (si la cargaron) y el enlace al sitio. Nada de correos, invitados, montos ni aportes | D-08 | Prueba de servidor (forma de la respuesta) |
| CA-4 | Se pide al menos 3 letras; como mucho 10 resultados, del más cercano en fecha al más lejano | — | Prueba de servidor |
| CA-5 | Límite de búsquedas por IP (para que no se pueda recorrer el listado entero) | — | Prueba de servidor (429) |
| CA-6 | Sin resultados: «No encontramos ningún casamiento con "…"». Un link pegado sigue abriendo la invitación | LAN-04 | Prueba de interfaz + recorrido |
| CA-7 | Elegir un resultado abre el sitio de la pareja | — | E2E |
| CA-8 | La página y la API no se indexan (`noindex`) | DP-16 | E2E / revisión |
| CA-9 | Funciona en celular y compu (320 a 1440 px), sin scroll horizontal | — | Recorrido en el navegador |

## Fuera de alcance
- Que Google indexe los sitios (DP-16 sigue pendiente).
- Que la pareja pueda ocultarse del buscador (se puede agregar después si hace falta).
- Buscar por fecha, ciudad o lugar.

## Preguntas abiertas
- **Aviso en la política de privacidad y en «Publicar»:** con D-08, el sitio publicado se puede encontrar por nombre. Hay que decirlo en `/privacidad` y en la confirmación de publicar. El texto legal lo revisa la dueña (con su asesor). No bloquea la construcción; sí la publicación en producción.

## Revisión de consistencia (antes de construir)
- [x] Todos los IDs citados existen y su estado es el indicado (LAN-05 estaba ocupado: la funcionalidad pasó a LAN-08).
- [x] Ningún criterio contradice una regla decidida. CA-2 se ajustó al construir: no hay «celebraciones pausadas» con la página caída, así que el buscador muestra exactamente lo que hoy se puede abrir.
- [x] Lo pendiente (revisión legal del aviso) está marcado y no bloquea la construcción.

## Verificación al cerrar
| Criterio | Evidencia |
|---|---|
| CA-1 | `src/test/server/search.test.ts` «encuentra por un nombre o los dos…» |
| CA-2 | `search.test.ts` «no muestra borradores ni páginas dadas de baja» |
| CA-3 | `search.test.ts` «cada resultado trae solo nombres, fecha y enlace» |
| CA-4 | `search.test.ts` «pide 3 letras, ordena…» |
| CA-5 | `search.test.ts` «limita las búsquedas por IP» |
| CA-6 | `e2e/search-by-name.spec.ts` (sin resultados y link pegado) y `e2e/audit.spec.ts` P-02/P-05 |
| CA-7 | `e2e/search-by-name.spec.ts` (resultado → sitio de la pareja) |
| CA-8 | `e2e/search-by-name.spec.ts` (`noindex`); la API responde con `x-robots-tag: noindex` |
| CA-9 | Recorrido en el navegador a 375 y 1440 px, sin scroll horizontal |

Pendiente para publicar en producción: revisión legal del aviso en `/privacidad` (sección «Qué es público»).
