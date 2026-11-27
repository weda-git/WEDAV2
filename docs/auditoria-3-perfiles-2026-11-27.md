# Auditoría con 3 perfiles: de la landing a la página publicada (2026-11-27)

Recorridos reales en el servidor local (`:8084`), con el boceto de «Tu sitio» aplicado y cuentas de prueba nuevas. Se contó cada toque. No hubo errores de consola en ningún recorrido.

| Perfil | Dispositivo | Qué quiere | Toques hasta publicar | Resultado |
|---|---|---|---|---|
| **Sofía**, 29, apurada | Celular 390 px | Solo la lista de regalos en pesos, rápido. Plan Regalos | 23 | Publicó |
| **Martín y Ana**, 45, poco tecnológicos | Compu 1440 px | Invitación completa, ceremonia y fiesta, regalos en pesos y dólares. Plan Celebración | 32 | Publicó |
| **Camila**, 34, detallista | Celular chico 360 px | Todo: su foto, dress code, fotos, playlist, regalo propio. Después edita y actualiza | 25 + 4 para actualizar | Publicó y actualizó |

El camino principal funciona para los tres. Las fricciones están en el detalle: textos de más, pasos que se repiten y avisos que faltan donde importan.

## Fricciones encontradas

### Errores (rompen o confunden mucho)
1. **Fotos invisibles en el panel, en celular** (Camila). Al subir fotos a «Fotos», en el celular se veían solo las flechas: la foto quedaba de 1 px. Una regla de otra pantalla mandaba los botones a una segunda columna. **Está en producción.** Ya está corregido en la rama del boceto.
2. **Se publica Celebración con «Eventos: Sin cargar»** (Camila). La página publicada muestra «EVENTO 1 · A CONFIRMAR · Lugar a confirmar». El resumen de publicación no lo advierte y dice «No te falta nada».
3. **El plan Regalos promete «Alias y tarjeta para recibir»**, pero la tarjeta está desactivada (solo alias). El texto sale de `plans.ts`.

### Fricciones de todos
4. **«Hola de nuevo» a quien acaba de registrarse** (los 3). Es la primera vez que entran.
5. **El resumen antes de publicar es largo y repetitivo.**
   - Dice «pago único» tres veces, y lista y tabla repiten lo mismo.
   - «Incluido, pero vacío» nombra secciones que nunca agregaron (galería, mensaje final, playlist).
   - En la compu, el botón «Publicar» queda debajo del borde y hay que scrollear dentro del diálogo.
6. **«Ver link» antes de publicar**, en la elección de plan: todavía no hay link para ver.
7. **«Copiar enlace» en Regalos antes de publicar** y con la lista vacía.

### Regalos y cobro
8. **Datos de cobro muestra «Cuenta en dólares» con punto de pendiente** aunque la lista es solo en pesos (Sofía).
9. **Mercado Pago tiene «Configurar»** pero no está disponible: es un botón que no lleva a nada útil.
10. **La primera carga de la cuenta pide Revisar → Confirmar**: una pantalla extra que solo repite el alias. Para cambiar una cuenta ya cargada, el paso extra sí tiene sentido (pide la clave).
11. **Después de agregar un pack no hay un «¿y ahora?»**: el paso siguiente (cargar la cuenta) no aparece. En el celular, el aviso «Agregaste 8 regalos» tapa justo el botón «Configurar».
12. **Las pestañas cambian de nombre entre compu y celular**: «Datos de cobro» y «Cobro», «Aportes recibidos» y «Aportes», «Catálogo y packs» y «Catálogo».

### Tu sitio
13. **El segundo evento obliga a reescribir lugar y dirección** (Martín y Ana escribieron dos veces «Estancia La Linda, Ruta 8 km 60»). La mayoría de las bodas tienen ceremonia y fiesta en el mismo lugar.
14. **El lugar del alta crea un evento sin nombre**: en la página aparece «Evento 1».
15. **En celular chico, el estado de Save the date se corta** («Con cuenta regresi…»).
16. **En la página pública, la playlist es una caja dentro de otra caja**: borde, título y adentro el reproductor de Spotify.

### Alta
17. **En celular, el número de WhatsApp no tiene borde**, mientras que el resto de los campos sí.
18. **Después de publicar dice «Ya la puede abrir cualquiera»**: quedó un «la» de cuando se llamaba «página».

## Mejoras propuestas

**Arreglos chicos (sin tocar reglas de negocio):** 4, 6, 7, 8, 9, 11, 12, 14 (proponer «Ceremonia» como nombre), 15, 16, 17, 18.
- 4: «¡Bienvenidos, Sofía y Tomás!» la primera vez, y «Hola de nuevo» desde la segunda.
- 6, 7: no mostrar «Ver link» ni «Copiar enlace» hasta que haya página publicada.
- 8, 9: mostrar solo las cuentas de las monedas de la lista; Mercado Pago queda solo con «Próximamente».
- 11: después de agregar regalos sin cuenta cargada, el aviso dice «Agregaste 8 regalos · Cargar tu cuenta →», y en el celular va arriba de la barra de abajo, sin tapar.
- 12: los mismos nombres en compu y celular.

**Necesitan tu aprobación** (dinero, planes o reglas de publicación):
- **3:** sacar «tarjeta» del texto del plan Regalos mientras no esté habilitada.
- **2:** al publicar Celebración con un evento sin lugar ni hora, avisar en el resumen («Eventos: falta el lugar de Evento 1») y dejar publicar igual, o pedir que se complete primero.
- **5:** resumen de publicación corto: plan y precio, una línea de qué se publica, solo los avisos que importan y el botón «Publicar» siempre a la vista.
- **10:** la primera carga de la cuenta se guarda con un solo «Guardar», sin «Revisar → Confirmar». Cambiarla después sigue pidiendo la clave.
- **13:** en el segundo y el tercer evento, un atajo «Mismo lugar que el anterior».

## Aplicado en el boceto (2026-11-27)
- 1: fotos visibles en el panel en celular.
- 4: «¡Bienvenidos!» la primera vez en el Inicio (en ese navegador) y «Hola de nuevo» desde la segunda.
- 6: en la elección de plan, «Ver link» pasó a «Ver cómo queda» (abre cómo quedaría con ese plan).
- 7: «Copiar enlace» en Regalos aparece solo con el sitio publicado.
- 8, 9:
  - Cobro muestra solo las cuentas de las monedas de la lista, o las que ya tienen datos cargados; con una sola, sin pestañas.
  - Mercado Pago queda con «Próximamente», sin botón.
- 11: en el Catálogo, con regalos agregados y sin cuenta cargada, aparece «Ya elegiste N regalos · Cargar mi cuenta».
- 12: las pestañas se llaman igual en compu y celular: Mis regalos, Catálogo, Aportes y Cobro.
- 14: el lugar que se carga en el alta crea el primer evento con el nombre «Ceremonia».
- 15: el estado de Save the date dice «Con contador» o «Sin contador».
- 16: la playlist conectada se ve sin la caja de afuera.
- 17: el campo de WhatsApp tiene borde, como los demás.
- 18: «Ya lo puede abrir…».

Pendientes de aprobación: 2, 3, 5, 10 y 13.

## Hallazgo aparte (al cerrar, 2026-11-27)
- **Recargar justo después de un cambio puede perderlo.** El panel guarda en el servidor 0,8 s después del último cambio (`remote.ts`, `DEBOUNCE`). Si se recarga antes de que ese guardado termine, al volver manda la versión del servidor y el último cambio se pierde.
  - Con el servidor cargado se nota más: dos pruebas que recargan enseguida («recargar en medio de la edición» y «Flujo 3») fallan en tanda y pasan solas.
  - No lo introdujo el rediseño (no toca el guardado).
  - Propuesta: al cerrar o recargar la página, mandar lo pendiente al servidor, o avisar «Guardando…» antes de salir.
