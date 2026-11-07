---
paths:
  - "src/routes/**"
  - "src/components/**"
  - "src/**/*.css"
  - "public/**"
---

# Modo boceto: rediseños rápidos del front (decisión de la dueña, 2026-11-07)

La dueña quiere probar rediseños de interfaz rápido, ver si le gustan y recién después dejarlos prolijos. Para eso hay dos etapas.

## Etapa 1 · Boceto
Vale cuando la dueña pide probar o rediseñar una pantalla («quiero ver…», «probá…», «rediseñá…») o cuando se trabaja en la rama `rediseno`.
- Se trabaja en la rama `rediseno` (o en una `rediseno/<pantalla>`), nunca en `main`. No se publica nada.
- Ciclo corto: cambiar → mostrar capturas de **compu y celular** → la dueña dice sí, no o «más así» → seguir.
- **No** se corren `npm test`, E2E, `lint` ni `build` en cada vuelta, ni se actualizan pruebas o documentación. Alcanza con que la pantalla cargue sin errores en la consola.
- No se piden aprobaciones por decisiones de diseño: se prueba y se muestra.
- Siguen valiendo los límites de siempre: no se tocan dinero, permisos, el esquema, datos personales ni el servidor, y no se inventan planes, precios ni funciones. Si un boceto necesitara algo de eso, se avisa y se espera.
- Commit libre en `rediseno` para no perder vueltas; push solo si la dueña quiere verlo en su celular (vista previa de Vercel).

## Etapa 2 · Cierre
Cuando la dueña dice que un boceto le gusta («queda», «cerralo», «pasalo a limpio»):
- Se pasa a limpio lo aprobado: accesibilidad, estados vacíos y de error, celular y compu, textos según `frontend-ux.md`.
- Se actualizan las pruebas y la documentación que correspondan (`docs/ux-flows.md`, `docs/design-system.md`).
- Se corre la verificación completa de `CLAUDE.md` y va a `main` por PR, como siempre.
- Lo que no le gustó se descarta, sin pasarlo a limpio.
