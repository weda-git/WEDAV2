# ADM-01 · Administración de cuentas — spec

- **Estado:** en construcción (aprobada 2026-11-21 por la dueña, con las propuestas D4 a D7)
- **Tamaño:** crítica (permisos, datos personales y de invitados; toca publicación)
- **Plan:** [plan.md](plan.md)

## Problema
Hoy la dueña de Weda no tiene cómo ayudar a una pareja que tiene un inconveniente (no puede entrar, se equivocó de correo, armó mal su lista) ni cómo frenar una cuenta problemática, salvo tocando la base a mano. Se busca una administración interna mínima, solo para la dueña, para ver cada cuenta y su casamiento, corregirlos y suspenderlos.

## Reglas y decisiones que aplica

| ID | Dónde está | Estado | Qué toma de ahí esta funcionalidad |
|---|---|---|---|
| ADM-01 | `docs/product-blueprint/01-feature-inventory.md` | DECIDIDO (Q5) | Es la primera parte de la administración interna: soporte y registro de acciones. Precios y planes (BR-16) quedan fuera |
| R7 | `docs/product-blueprint/05-implementation-roadmap.md` | — | «Soporte resuelve un reclamo sin consultar la base a mano»; registro de acciones |
| BR-43 | `docs/product-blueprint/02-business-rules-catalog.md` | DECIDIDO (principio) | Lo financiero no se borra: por eso no hay borrado, solo suspensión |
| RK-05 | `docs/product-blueprint/03-open-decisions-and-risks.md` | riesgo abierto | Las tablas borran en cascada desde el casamiento: ninguna acción de esta spec borra filas |
| BR-46 | `docs/product-blueprint/02-business-rules-catalog.md` | DECIDIDO | Suspender no es eliminar la cuenta ni ejercer un derecho legal |
| DP-12 | `docs/product-blueprint/03-open-decisions-and-risks.md` | PENDIENTE | Eliminación de cuentas: sigue pendiente, no se construye acá |
| IC-04 / Q4 | `docs/product-blueprint/03-open-decisions-and-risks.md` | DECIDIDO | Los datos de cobro (alias, CBU) tienen controles propios: la administración no los cambia |
| BR-14 | `docs/product-blueprint/02-business-rules-catalog.md` | DECIDIDO | Republicar respeta el plan contratado |

## Decisiones de la funcionalidad
Aprobadas por la dueña el 2026-11-21:
- **D1 · Quién administra:** solo la cuenta de la dueña. Su correo se configura en el servidor (variable de entorno); no hay pantalla para sumar administradores.
- **D2 · «Eliminar» es suspender:** la cuenta no puede entrar y su sitio deja de verse. No se borra nada y se puede revertir (reactivar).
- **D3 · Qué puede hacer la administración:**
  1. Ver todo de cada cuenta en solo lectura: correo, fecha de alta, plan y estado de publicación, invitados, regalos y aportes recibidos.
  2. Despublicar y republicar el sitio.
  3. Cambiar el correo de la cuenta y mandarle un enlace para elegir una clave nueva.
  4. Entrar al panel de la pareja «como ella» para corregir sitio y regalos.

Propuestas de esta spec (a aprobar junto con ella):
- **D4 · Nunca ve ni pone una clave:** para la clave se manda el enlace de recuperación al correo de la cuenta; la dueña no escribe la clave de nadie.
- **D5 · «Entrar como» es visible y limitado:** mientras dura, una franja fija dice «Estás viendo la cuenta de X · Salir». Dura como máximo 30 minutos. Desde ahí no se pueden cambiar los datos de cobro, el correo, la clave, ni pagar.
- **D6 · Todo queda registrado:** cada acción de la administración (ver una cuenta, suspender, reactivar, despublicar, republicar, cambiar correo, mandar enlace, entrar como y cada guardado hecho entrando como) queda en un registro con fecha, qué se hizo y sobre qué cuenta. El registro no se puede editar ni borrar desde la aplicación.
- **D7 · A la pareja se le avisa:** al suspender, reactivar o cambiar el correo, la pareja recibe un correo que lo dice. Entrar como no avisa (es soporte pedido por ella).

## Criterios de aceptación
| # | Criterio | Regla | Cómo se verifica |
|---|---|---|---|
| CA-1 | `/admin` y `/api/admin/*` responden solo a la cuenta configurada como administradora; cualquier otra recibe 404 (no se revela que existe) | D1 | Prueba de servidor con cuenta común, sin sesión y con la administradora |
| CA-2 | La lista de cuentas muestra correo, nombres de la pareja, fecha de alta, plan, estado (borrador, publicada, suspendida) y se puede buscar por correo o nombre | D3.1 | Prueba de servidor + recorrido |
| CA-3 | El detalle de una cuenta muestra invitados, regalos y aportes en solo lectura; los comprobantes se abren solo desde ahí | D3.1 | Prueba + recorrido |
| CA-4 | Suspender: la cuenta no puede ingresar (mensaje claro), sus sesiones abiertas se cierran y su sitio público responde «no disponible». Reactivar lo deshace sin pérdida de datos | D2, BR-43 | Prueba de servidor: antes y después, mismas filas en todas las tablas |
| CA-5 | Ninguna acción de la administración borra filas de la base | BR-43, RK-05 | Prueba que cuenta filas antes y después de cada acción |
| CA-6 | Despublicar y republicar desde la administración funcionan igual que para la pareja, respetando el plan | D3.2, BR-14 | Prueba de servidor |
| CA-7 | Cambiar el correo: el nuevo correo sirve para ingresar, el anterior no, y se avisa a los dos correos | D3.3, D7 | Prueba de servidor (Auth simulado) |
| CA-8 | Mandar enlace de clave usa el mismo flujo que «Olvidé mi clave»; la administración nunca ve ni escribe una clave | D4 | Prueba de servidor |
| CA-9 | Entrar como: muestra la franja, vence a los 30 minutos, y los cambios de cobro, correo, clave y pagos responden 403 | D5, IC-04 | Prueba de servidor + recorrido |
| CA-10 | Cada acción de CA-3 a CA-9 deja una entrada en el registro, visible en la administración | D6 | Prueba de servidor |
| CA-11 | La pareja recibe el correo de aviso al suspender, reactivar y cambiar correo | D7 | Prueba con el buzón simulado |

## Fuera de alcance
- Borrar cuentas o datos (DP-12 pendiente).
- Precios y planes editables (BR-16), métricas (ADM-02), roles de personal y segundo factor (quedan para cuando haya más de una persona).
- Cambiar los datos de cobro de una pareja.
- Hacer reembolsos o tocar pagos.

## Preguntas abiertas
- **Segundo factor para la administradora** (R7 lo pide para el rol de personal). Propuesta: no en esta etapa, con una sola cuenta; queda como riesgo anotado. No bloquea si la dueña lo acepta.
- **Texto legal:** la política de privacidad en borrador debería mencionar que Weda puede acceder a la cuenta para dar soporte. Lo revisa el asesor legal (RK-08). No bloquea la construcción; sí la publicación de la política final.

## Revisión de consistencia (antes de construir)
- [ ] Todos los IDs citados existen y su estado es el indicado.
- [ ] Ningún criterio contradice una regla decidida.
- [ ] Lo pendiente está marcado como pendiente y no bloquea, o la construcción espera.

## Verificación al cerrar
| Criterio | Evidencia |
|---|---|
| CA-1 … CA-11 | |
