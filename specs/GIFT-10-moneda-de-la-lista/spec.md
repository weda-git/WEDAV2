# GIFT-10 · Moneda de la lista de regalos (pesos o dólares) — spec

- **Estado:** en construcción (aprobada 2026-11-23 por la dueña, con las propuestas D4 a D9)
- **Tamaño:** crítica (dinero: importes, totales y aportes; cambia el esquema de la base)
- **Plan:** [plan.md](plan.md)

## Problema
Hoy todos los importes de la lista de regalos son pesos implícitos: no tienen moneda guardada, el panel mostraba un «total en dólares» sin dato y una pareja que quiere recibir regalos en dólares no puede. Se busca que cada pareja elija si su lista es en pesos o en dólares, y que todo lo que se ve (regalos, aportes, totales y correos) lo diga en esa moneda.

## Reglas y decisiones que aplica

| ID | Dónde está | Estado | Qué toma de ahí esta funcionalidad |
|---|---|---|---|
| GIFT-10 | `docs/product-blueprint/01-feature-inventory.md` | DECIDIDO (Q3) | Moneda de recepción ARS o USD, importes con moneda |
| BR-21 | `docs/product-blueprint/02-business-rules-catalog.md` | DECIDIDO (Q3) | Elegida por la pareja; todo importe lleva su moneda; sin conversión ni sumas entre monedas |
| BR-53 | `docs/product-blueprint/02-business-rules-catalog.md` | DECIDIDO | Los totales se informan por moneda |
| RK-05 / IC-23 | `docs/product-blueprint/03-open-decisions-and-risks.md` | riesgo abierto | Importes sin moneda explícita: esta spec lo resuelve para regalos y aportes |
| PAY-11 / DP-10 | `docs/product-blueprint/01-feature-inventory.md`, `03-open-decisions-and-risks.md` | PENDIENTE | Planes de Weda en USD: **fuera de alcance** (los planes siguen en pesos) |
| GIFT-12 | `docs/product-blueprint/01-feature-inventory.md` | DECIDIDO, no implementado | Libro inmutable: fuera de alcance; la moneda queda guardada en cada aporte para cuando exista |

## Decisiones de la funcionalidad
Aprobadas por la dueña el 2026-11-23:
- **D1 · Dónde se elige:** en Regalos, con un selector «Pesos / Dólares». Por defecto, pesos.
- **D2 · Una moneda por lista:** todos los regalos de una lista están en la misma moneda; los totales se muestran en esa moneda.
- **D3 · Catálogo en dólares:** cada regalo del catálogo y cada gift card tiene un precio en dólares, fijo y definido por Weda. Sin conversión ni cotización.

Propuestas de esta spec (a aprobar junto con ella):
- **D4 · Cuándo se puede cambiar:** mientras la lista no haya recibido ningún aporte. Con aportes, la moneda queda fija (no se mezclan monedas en lo recibido). El selector lo explica.
- **D5 · Qué pasa al cambiar:** los regalos del catálogo toman su precio en la otra moneda; los regalos propios **se quedan sin monto válido** hasta que la pareja les ponga el nuevo (se avisa cuáles y no se puede publicar con montos faltantes). No se convierte nada.
- **D6 · Cómo se ve el monto:** pesos como hoy («$ 250.000»); dólares como «US$ 250». El mismo formato en el panel, la invitación, el ejemplo, los aportes y los correos.
- **D7 · Mínimos en dólares:** monto mínimo de un regalo US$ 10 (en pesos sigue $ 1.000); el máximo, proporcional.
- **D8 · Cobro:** el alias y el CBU son los mismos datos de hoy; si la lista es en dólares, el panel aclara que la cuenta tiene que aceptar dólares. No se valida con el banco.
- **D9 · Cada aporte guarda su moneda**, en el momento en que llega, aunque después cambie la lista.

## Criterios de aceptación
| # | Criterio | Regla | Cómo se verifica |
|---|---|---|---|
| CA-1 | La pareja elige Pesos o Dólares en Regalos; por defecto, pesos. Las listas existentes quedan en pesos | D1, GIFT-10 | Prueba de interfaz + migración |
| CA-2 | Con dólares, el catálogo y las gift cards muestran su precio en dólares; con pesos, el de hoy | D3 | Prueba unitaria del catálogo |
| CA-3 | Todos los regalos de una lista están en su moneda; un regalo propio se crea en la moneda de la lista | D2 | Prueba unitaria |
| CA-4 | Con al menos un aporte recibido, la moneda no se puede cambiar (el servidor responde 409 y el panel lo explica) | D4, BR-21 | Prueba de servidor |
| CA-5 | Al cambiar de moneda, los regalos propios sin monto en la nueva moneda quedan marcados y publicar avisa qué falta | D5 | Prueba de interfaz |
| CA-6 | La invitación, el ejemplo, el diálogo de regalar y los correos muestran la moneda de la lista con el formato de D6 | D6 | Prueba de interfaz + correo simulado |
| CA-7 | Cada aporte guarda su moneda; «Aportes recibidos» muestra el total en esa moneda y nunca suma monedas distintas | D9, BR-21, BR-53 | Prueba de servidor |
| CA-8 | Los mínimos y máximos dependen de la moneda (D7), en el panel y en el servidor | D7 | Prueba unitaria + servidor |
| CA-9 | Ningún importe se convierte de una moneda a otra en ningún lugar | BR-21 | Revisión de código + prueba |

## Fuera de alcance
- Planes de Weda en dólares (PAY-11, DP-10).
- Cotizaciones o conversiones.
- Listas con regalos en las dos monedas a la vez.
- Validar que la cuenta bancaria acepte dólares.
- El libro inmutable de transacciones (GIFT-12).

## Preguntas abiertas
- **Precios en dólares del catálogo (D3):** criterio de la dueña (2026-11-23): $ 1.500 por dólar, redondeado para arriba y sin decimales; las gift cards a decenas (US$ 40, 70, 100, 170, 200 y 340). Los revisa antes de publicar.
- **Cambio respecto del plan:** un regalo propio sin monto en la nueva moneda **no bloquea** publicar: no se muestra en la invitación hasta que tenga monto, y «Antes de publicar» lo avisa (así nunca aparece un monto viejo con la otra moneda).
- **Textos legales:** los términos en borrador hablan de pesos; el asesor legal los revisa (RK-08). No bloquea.

## Revisión de consistencia (antes de construir)
- [ ] Todos los IDs citados existen y su estado es el indicado.
- [ ] Ningún criterio contradice una regla decidida.
- [ ] Lo pendiente está marcado como pendiente y no bloquea, o la construcción espera.

## Verificación al cerrar
| Criterio | Evidencia |
|---|---|
| CA-1 … CA-9 | |
