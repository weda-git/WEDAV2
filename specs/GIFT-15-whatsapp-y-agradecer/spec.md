# GIFT-15 / ONB-06 · WhatsApp en el alta y en el regalo, y «Agradecer por WhatsApp» — spec

- **Estado:** construida (aprobada por la dueña el 2026-11-23, con D5 a D8 y la migración 5)
- **Tamaño:** crítica (datos personales de la pareja y de los invitados; cambia el esquema de la base)
- **Plan:** [plan.md](plan.md)

## Problema
Hoy el alta pide los nombres, la fecha (opcional) y el lugar (opcional), y no pide ningún teléfono. Quien regala deja solo su correo. La dueña quiere:
- un WhatsApp de cada pareja, para tener contacto directo;
- la fecha siempre;
- el WhatsApp de quien regala, para que la pareja le agradezca con un toque.

## Reglas y decisiones que aplica
| ID | Dónde está | Estado | Qué toma de ahí |
|---|---|---|---|
| ONB-01 | `docs/product-blueprint/01-feature-inventory.md` | DOCUMENTADO | Pasos del alta: cuenta → nombres → fecha → foto. Esta spec lo cambia (ver D1 y D2) |
| BR-27 | `02-business-rules-catalog.md` | DECIDIDO | Los datos de quien regala solo se ven en el panel privado, nunca en lo público |
| DP-30 | `03-open-decisions-and-risks.md` | PENDIENTE | Mensajes por WhatsApp a la pareja con consentimiento explícito: **fuera de alcance** (D7) |
| DP-22 / GST-10 | `03-open-decisions-and-risks.md` | PENDIENTE | Envío de invitaciones por WhatsApp: **fuera de alcance** |
| RK-08 | `03-open-decisions-and-risks.md` | riesgo abierto | Los textos legales (privacidad) se actualizan y los revisa el asesor (ver Preguntas abiertas) |

## Decisiones
Aprobadas por la dueña el 2026-11-23:
- **D1 · WhatsApp de la pareja, obligatorio.** Se pide en el primer paso del alta, junto a los nombres. Sin él no se puede seguir.
- **D2 · Fecha obligatoria, con escape.** El paso de la fecha la pide siempre. Quien todavía no la sabe tilda «Todavía no la sabemos» y la completa después. El lugar sigue siendo opcional.
- **D3 · WhatsApp de quien regala, obligatorio.** En el formulario de regalo, junto al correo (que ya es obligatorio). El texto explica para qué: «Para que los novios te agradezcan».
- **D4 · Uso del WhatsApp de la pareja:** contacto de la cuenta y soporte de Weda. No se usa para promociones: eso queda para DP-30, con un permiso aparte.

Propuestas (a aprobar con esta spec):
- **D5 · Botón «Agradecer por WhatsApp».**
  - Dónde: en «Aportes recibidos», cada aporte con WhatsApp tiene ese botón.
  - Qué hace: abre WhatsApp (en el celular o en la compu) con el chat de quien regaló y un mensaje ya escrito. La pareja lo puede cambiar antes de mandarlo. Weda no manda nada: lo manda la pareja desde su WhatsApp.
  - El mensaje: «¡Hola, Nora! Muchas gracias por regalarnos Excursión en barco. Nos hizo muy felices. Ana y Leo». Con varios regalos, los nombra a todos.
  - Después de tocarlo, el aporte queda marcado «Agradecido», para que la pareja sepa a quién le falta.
- **D6 · Formato del número.**
  - Se pide con el código del país adelante, por defecto +54 (Argentina), y se puede cambiar.
  - Se guarda en formato internacional, solo números (por ejemplo 5491155554444), que es lo que usa el enlace de WhatsApp.
  - Para Argentina se agrega el 9 de celular si falta.
  - Se valida que tenga una cantidad de dígitos razonable. No se verifica que el número exista.
- **D7 · Las parejas que ya tienen cuenta.** Ven un aviso en el inicio del panel, «Sumá tu WhatsApp», que se puede cerrar. No se les bloquea nada.
- **D8 · Dónde se ve cada número.**
  - El de quien regala: solo en el panel de la pareja y, enmascarado, en la administración.
  - El de la pareja: en su panel (editable en «Datos del casamiento») y en la administración, para soporte.
  - Ninguno de los dos llega nunca a la página pública ni a la vista previa.

## Criterios de aceptación
| # | Criterio | Regla | Cómo se verifica |
|---|---|---|---|
| CA-1 | El primer paso del alta pide el WhatsApp de la pareja y no deja seguir sin uno válido | D1, D6 | E2E del alta + unitaria del formato |
| CA-2 | El paso de la fecha no deja seguir sin fecha, salvo que se tilde «Todavía no la sabemos» | D2 | E2E |
| CA-3 | El formulario de regalo no deja enviar sin WhatsApp válido. El servidor también lo exige y lo guarda con el aporte | D3, D6 | Servidor + interfaz |
| CA-4 | En «Aportes recibidos», «Agradecer por WhatsApp» abre `wa.me` con el número y el mensaje de D5, y el aporte queda «Agradecido» | D5 | Unitaria del enlace + interfaz |
| CA-5 | Ningún WhatsApp aparece en la página pública, en lo publicado ni en la respuesta de la API pública | D8, BR-27 | Servidor |
| CA-6 | La pareja cambia su WhatsApp en «Datos del casamiento»; sin WhatsApp, el panel muestra el aviso de D7 | D7 | Interfaz |
| CA-7 | La administración ve el WhatsApp de la pareja, y el de quien regala enmascarado | D8 | Servidor |

## Cambio en la base (necesita aprobación)
- **Migración 5:**
  - `contributions.giver_phone TEXT NOT NULL DEFAULT ''`: el WhatsApp de quien regala. Los aportes anteriores quedan sin número.
  - `contributions.thanked_at TEXT`: cuándo la pareja tocó «Agradecer» (D5).
- **WhatsApp de la pareja:** va en el borrador (`couple.whatsapp`), que es JSON, así que no cambia el esquema. El servidor lo deja afuera de lo publicado.

## Fuera de alcance
- Que Weda mande mensajes de WhatsApp por su cuenta (API de WhatsApp Business), sea a la pareja o al invitado.
- Promociones por WhatsApp (DP-30).
- Mandar invitaciones por WhatsApp (DP-22).
- Verificar el número con un código.
- Pedir el WhatsApp en la confirmación de asistencia.

## Preguntas abiertas
- **Política de privacidad:** hay que sumar que se piden los WhatsApp y para qué. Propongo un texto y lo revisa el asesor legal (RK-08). No bloquea construir; sí conviene antes de publicar.

## Revisión de consistencia (antes de construir)
- [ ] Todos los IDs citados existen y su estado es el indicado.
- [ ] Ningún criterio contradice una regla decidida.
- [ ] Lo pendiente está marcado como pendiente y no bloquea.

## Verificación al cerrar
| Criterio | Evidencia |
|---|---|
| CA-1 … CA-7 | |
