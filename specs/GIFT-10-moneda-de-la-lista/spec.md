# GIFT-10 · Moneda de la lista de regalos (pesos, dólares o las dos) — spec v2

- **Estado:** a aprobar (v2, 2026-11-23). Reemplaza la v1 («una moneda por lista»), aprobada y construida en el PR #45 pero no publicada.
- **Tamaño:** crítica (dinero: importes, aportes y cuentas de cobro; cambia el esquema de la base)
- **Plan:** [plan.md](plan.md) (se actualiza al aprobar esta spec)

## Problema
La v1 dejaba elegir una sola moneda con un selector «Moneda de tu lista» que no se entendía. La dueña quiere:
- que la pareja elija la moneda **al empezar a armar la lista**, y la pueda cambiar después;
- poder mostrar la lista en pesos, en dólares **o en las dos**;
- tener una cuenta de cobro en pesos, otra en dólares, o las dos;
- montos siempre redondos.

Referencia visual: un selector de divisa con dos círculos, «AR$» y «US$», con la moneda elegida resaltada.

## Reglas y decisiones que aplica
| ID | Dónde está | Estado | Qué toma de ahí |
|---|---|---|---|
| GIFT-10 | `docs/product-blueprint/01-feature-inventory.md` | DECIDIDO (Q3) | Moneda de recepción ARS o USD, importes con moneda |
| BR-21 | `02-business-rules-catalog.md` | DECIDIDO (Q3), **se ajusta** | Todo importe lleva su moneda y nunca se suman monedas. Cambia: Weda **sugiere** el monto en la otra moneda a una cotización fija (ver D5), y la pareja lo puede editar |
| BR-53 | `02-business-rules-catalog.md` | DECIDIDO | Totales por moneda |
| GIFT-14 / BR-30 | `01-feature-inventory.md`, `02-business-rules-catalog.md` | DECIDIDO | Cambios de cobro versionados, con clave para modificar, límite diario y correo de aviso. Ahora vale **por cuenta** |
| PAY-11 / DP-10 | `03-open-decisions-and-risks.md` | PENDIENTE | Planes de Weda en USD: **fuera de alcance** |

## Decisiones
Aprobadas por la dueña el 2026-11-23:
- **D1 · La moneda se elige al empezar.** La primera vez que la pareja agrega un regalo, del catálogo o propio, Weda pregunta «¿En qué moneda armás tu lista?». Hay tres opciones: **AR$ Pesos**, **US$ Dólares** y **Las dos**. Se sacan el selector «Moneda de tu lista» y el aviso de dólares en Cobro.
- **D2 · Se puede cambiar.** En Mis regalos se ve la moneda elegida («AR$ · Cambiar», por ejemplo), que abre el mismo selector.
- **D3 · Con «Las dos», elige el invitado.** En la invitación, la lista muestra un selector AR$ / US$ como el de la referencia. El invitado ve los precios en la moneda que elige y transfiere a la cuenta de esa moneda.
- **D4 · Una cuenta por moneda.** En Datos de cobro hay dos pestañas, AR$ y US$. Cada una tiene su propio alias, banco y CBU (opcional). Cada cuenta conserva las protecciones de hoy: versiones, clave para cambiarla, límite por día y correo de aviso.
- **D5 · Cada regalo tiene precio en las dos monedas.** El catálogo y las gift cards ya lo tienen. En un regalo propio, la pareja pone el monto en una moneda y Weda completa la otra a **$ 1.500 por dólar**, redondeada; la pareja la puede cambiar. Como cada regalo tiene siempre los dos precios, cambiar de moneda **no deja regalos sin monto**.
- **D6 · Montos redondos y sin decimales.**
  - Los dólares se redondean a la decena, para arriba: US$ 167 pasa a 170 y US$ 934 a 940.
  - Los pesos calculados desde dólares se redondean al millar, para arriba.
  - Las gift cards quedan en US$ 40, 70, 100, 170, 200 y 340.

Propuestas (a aprobar con esta spec):
- **D7 · Qué cuenta hace falta para publicar.** Una cuenta por cada moneda que muestra la lista: AR$ pide la de pesos, US$ la de dólares y «Las dos», ambas. Si falta una, «Antes de publicar» lo avisa, como hoy con el alias.
- **D8 · Cada aporte guarda su moneda,** la que eligió el invitado, y su monto en esa moneda. «Aportes recibidos» muestra un total por moneda.
- **D9 · La moneda se puede cambiar aunque ya haya aportes.** Los aportes recibidos no cambian, y ya no hace falta bloquear el cambio porque nunca se suman monedas. Esto saca el bloqueo `currency_locked` de la v1.
- **D10 · El invitado empieza viendo pesos.** Con «Las dos», la invitación arranca en AR$ y él cambia a US$ si quiere.
- **D11 · Mínimos por moneda.** Como en la v1: desde $ 1.000 o desde US$ 10.

## Criterios de aceptación
| # | Criterio | Regla | Cómo se verifica |
|---|---|---|---|
| CA-1 | El primer regalo que se agrega pide elegir AR$, US$ o Las dos. Las listas que ya existen quedan en AR$ sin preguntar | D1 | Prueba de interfaz + unitaria |
| CA-2 | La moneda se cambia desde Mis regalos. Ningún regalo pierde su monto al cambiar | D2, D5 | Unitaria |
| CA-3 | Todo regalo tiene monto en pesos y en dólares. En los propios, el de la otra moneda se calcula redondeado y se puede editar | D5, D6 | Unitaria |
| CA-4 | Ningún monto tiene decimales. Los dólares del catálogo son múltiplos de 10 | D6 | Unitaria sobre todo el catálogo |
| CA-5 | Con «Las dos», la invitación muestra el selector AR$ / US$. Precios, filtros, diálogo de regalar, cuenta y correo usan la moneda elegida | D3, D10 | Interfaz + servidor |
| CA-6 | Datos de cobro tiene una cuenta AR$ y otra US$, cada una versionada y protegida por separado | D4, GIFT-14 | Servidor |
| CA-7 | Sin la cuenta de alguna moneda que muestra la lista, «Antes de publicar» lo avisa | D7 | Unitaria |
| CA-8 | El servidor guarda la moneda elegida por el invitado y solo acepta monedas que la lista muestra. El monto sale del snapshot en esa moneda | D8 | Servidor |
| CA-9 | Los aportes se totalizan por moneda y nunca se suman entre sí | D8, BR-21 | Servidor + interfaz |

## Cambio en la base (necesita aprobación)
- **Migración 4:** `payout_methods.currency TEXT NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS','USD'))`.
  - La cuenta vigente de cada moneda es su versión más alta.
  - Las cuentas cargadas hoy pasan a ser la de pesos.
- **Migración 3 (de la v1, sin cambios):** `contributions.currency`.

## Fuera de alcance
- Planes de Weda en dólares (PAY-11, DP-10).
- Cotización en vivo: la cotización de $ 1.500 es fija y solo sirve para sugerir montos.
- Validar con el banco que una cuenta acepte dólares.
- El libro inmutable de transacciones (GIFT-12).

## Preguntas abiertas
- Los textos legales hablan de pesos y los revisa el asesor (RK-08). No bloquea.

## Verificación al cerrar
| Criterio | Evidencia |
|---|---|
| CA-1 … CA-9 | |
