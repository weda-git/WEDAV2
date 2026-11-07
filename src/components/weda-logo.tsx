import { useId } from 'react';

// Logo oficial de Weda (v2.0). La geometría es la del archivo `public/weda-logo.svg`, sin cambios: no redibujar ni reemplazar por texto.
// Toma `currentColor`: sobre fondos claros va #5D573F (Dragon) y sobre fondos oscuros #ECE9E2 (White Tea); ver `.seed-logo` en styles.css.
// Va dentro de un enlace con su propio nombre accesible («Weda, …»), por eso el SVG es decorativo.
// Letras apenas más finas (pedido de la dueña, 2026-11-07): un filtro las afina sin tocar los trazos, el interletrado ni los círculos.
// `THIN` está en unidades del dibujo (3342 de ancho): 0 = el grosor original del archivo.
const THIN = 6;
// Al afinar, el espacio entre letras crece 2 × THIN: se acercan esa misma distancia para conservar el interletrado visual del original.
const GAP = THIN * 2;
export function WedaLogo({ className }: { className?: string }) {
  const id = `weda-thin-${useId().replace(/:/g, '')}`;
  return (
    <svg className={className ?? 'weda-logo'} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${3342 - GAP * 3 - THIN} 722`} fill="currentColor" aria-hidden="true" focusable="false">
      <defs><filter id={id} x="-2%" y="-2%" width="104%" height="104%"><feMorphology operator="erode" radius={THIN} /></filter></defs>
      <g fill="currentColor" filter={`url(#${id})`}><path transform="translate(0.0 710.0) scale(1 -1)" d="M476 530H364L255 148L148 530H21L183 0H316L420 355L524 0H657L819 530H692L585 148Z"/><path transform={`translate(${765.0 - GAP * 1} 710.0) scale(1 -1)`} d="M42 265C42 97 146 -12 304 -12C419 -12 515 51 546 153L414 163C395 117 352 90 304 90C229 90 183 142 177 230H554L553 262C551 450 440 542 304 542C146 542 42 433 42 265ZM179 316C189 393 234 440 304 440C360 440 410 406 420 316Z"/><path transform={`translate(${1286.0 - GAP * 2} 710.0) scale(1 -1)`} d="M554 710H424V459C394 511 334 542 266 542C128 542 42 435 42 265C42 95 128 -12 266 -12C338 -12 399 21 428 75L431 0H554ZM175 265C175 373 225 441 304 441C382 441 433 373 433 265C433 160 383 92 304 92C226 92 175 160 175 265Z"/><path transform={`translate(${1835.0 - GAP * 3} 710.0) scale(1 -1)`} d="M50 369 182 361C195 419 231 449 287 449C356 449 390 410 391 330L242 300C118 275 42 242 42 139C42 45 126 -12 232 -12C324 -12 384 28 408 80C418 -2 503 -1 544 -1L574 0V94H554C534 94 521 102 521 133V314C521 463 440 542 287 542C157 542 71 478 50 369ZM175 143C175 204 226 211 293 224L393 242V236C393 131 339 79 267 79C205 79 175 107 175 143Z"/></g>
      <g fill="currentColor">
      <circle cx={2868.7 - GAP * 3 - THIN} cy="473.3" r="236.7"/>
      <circle cx={3105.4 - GAP * 3 - THIN} cy="236.7" r="236.7"/></g>
    </svg>
  );
}
