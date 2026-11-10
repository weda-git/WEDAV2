import { Link } from '@tanstack/react-router';
import { Fragment, useEffect, useRef, type ComponentType, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { BudgetMock, NoFeeMock, ReceivedMock } from '@/components/gift-mocks';

/* Las tres ventajas de la lista de regalos, una debajo de la otra: maqueta y explicación, alternando el lado.
   Se usan en la sección Regalos de la landing (un solo botón, dentro del último bloque) y en /lista-de-regalos (con un botón cada una).
   «Pedí en grande» se sacó (pedido de la dueña, 2026-11-03). Cada bloque entra al bajar con `useReveal` (clase `.gift-feature`). */

/** `text`: los renglones como se ven en el celular (se cortan ahí solo en la landing en una columna; en la compu el texto corre normal). */
type Item = { title: string; text: string[]; Mock: ComponentType; cta: { label: string; to: '/crear/cuenta' | '/ejemplo/regalos' } };

const ITEMS: Item[] = [
  {
    title: 'Sin comisión: el regalo entero es para ustedes',
    text: ['Tus invitados transfieren directo a la', 'cuenta que cargaste. Weda no cobra', 'ni mueve el dinero de los regalos.'],
    Mock: NoFeeMock, cta: { label: 'Crear mi lista de regalos', to: '/crear/cuenta' },
  },
  {
    title: 'Regalos que se adaptan a\u00a0cada bolsillo', // «a cada» juntos: el renglón no termina en «a»
    text: ['Armá tu lista de regalos con distintos', 'montos. Tus invitados pueden filtrar por', 'precio y elegir el que les quede cómodo.'],
    Mock: BudgetMock, cta: { label: 'Ver regalos', to: '/ejemplo/regalos' },
  },
  {
    title: 'Sabé quién te regaló qué',
    text: ['Seguí cada regalo con su comprobante,', 'quién te lo hizo y el mensaje que te', 'dejó, y no te olvides de agradecer.'],
    Mock: ReceivedMock, cta: { label: 'Crear mi lista de regalos', to: '/crear/cuenta' },
  },
];

/** `withCta`: un botón en cada bloque (/lista-de-regalos). `endCta`: un único botón dentro del último bloque (landing).
 *  `label`: un rótulo chico arriba del primer título, para presentar de qué habla la sección (landing: «Lista de regalos»). */
/* Celular y tablet (una columna): cada maqueta se ajusta a un mismo marco (el mismo ancho y alto de «tinta», centrada), así las tres hojas pesan
   igual aunque cada maqueta tenga otra forma (pedido de la dueña, 2026-11-10). Se mide lo que se ve (sus hijos), no la caja. En la compu no se toca. */
const ONE_COLUMN = '(max-width: 900px)';
function useFitMocks(root: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el || typeof window === 'undefined') return;
    const mq = window.matchMedia(ONE_COLUMN);
    let raf = 0;
    const fit = () => {
      el.querySelectorAll<HTMLElement>('.gift-feature-stage').forEach(stage => {
        const mk = stage.querySelector<HTMLElement>('.mk');
        if (!mk) return;
        mk.style.transform = ''; mk.style.transformOrigin = '';
        if (!mq.matches) return;
        const sb = stage.getBoundingClientRect(); const mb = mk.getBoundingClientRect();
        const ink = [...mk.querySelectorAll<HTMLElement>('*')].map(e => e.getBoundingClientRect()).filter(b => b.width > 4 && b.height > 4)
          .reduce((a, b) => ({ l: Math.min(a.l, b.left), t: Math.min(a.t, b.top), r: Math.max(a.r, b.right), b: Math.max(a.b, b.bottom) }), { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity });
        if (!Number.isFinite(ink.l) || !sb.width || !sb.height) return;
        const w = ink.r - ink.l, h = ink.b - ink.t;
        // Mismo «peso» para las tres: la tinta ocupa el 80 % del área del marco, sin pasarse de su ancho ni de su alto.
        const k = Math.min(Math.sqrt((0.8 * sb.width * sb.height) / (w * h)), sb.width / w, sb.height / h);
        // Origen arriba a la izquierda de la maqueta: se escala y se corre para que la tinta quede centrada en el marco.
        const x = sb.left + (sb.width - w * k) / 2 - (mb.left + (ink.l - mb.left) * k);
        const y = sb.top + (sb.height - h * k) / 2 - (mb.top + (ink.t - mb.top) * k);
        mk.style.transformOrigin = '0 0';
        mk.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${k.toFixed(4)})`;
      });
    };
    const run = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); };
    run();
    const ro = new ResizeObserver(run);
    el.querySelectorAll('.gift-feature-stage').forEach(s => ro.observe(s));
    el.querySelectorAll('img').forEach(img => { if (!img.complete) img.addEventListener('load', run, { once: true }); });
    mq.addEventListener('change', run);
    void document.fonts?.ready.then(run);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); mq.removeEventListener('change', run); };
  }, [root]);
}

export function GiftFeatures({ level = 2, withCta = false, endCta, label }: { level?: 2 | 3; withCta?: boolean; endCta?: ReactNode; label?: string }) {
  const H = level === 2 ? 'h2' : 'h3';
  const root = useRef<HTMLDivElement>(null);
  useFitMocks(root);
  return (
    <div className="gift-features" ref={root}>
      {ITEMS.map(({ title, text, Mock, cta }, i) => (
        <article key={title} className={`gift-feature${i % 2 ? ' is-flip' : ''}`}>
          <div className="gift-feature-stage"><Mock /></div>
          <div className="gift-feature-copy">
            {label && i === 0 && <p className="gift-feature-label">{label}</p>}
            <H>{title}</H>
            <p>{text.map((line, k) => <Fragment key={k}>{line}{k < text.length - 1 && <>{' '}<br className="gf-br" /></>}</Fragment>)}</p>
            {withCta && <Button variant="seed" asChild><Link to={cta.to}>{cta.label}</Link></Button>}
            {endCta && i === ITEMS.length - 1 && endCta}
          </div>
        </article>
      ))}
    </div>
  );
}
