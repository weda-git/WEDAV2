import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { FloatNav } from '@/components/float-nav';
import { SiteFooter } from '@/components/site-footer';
import { GiftFeatures } from '@/components/gift-features';
import { useReveal } from '@/lib/reveal';
// Los estilos de esta página viajan con su código (no con la landing, auditoría F-06).
import '@/lista-regalos.css';

/* Página de la lista de regalos (pedido de la dueña, 2026-11-20): las tres ventajas como hojas apiladas (sin comisión, cada bolsillo y
   quién te regaló qué), con el título «Lista de regalos» centrado arriba dentro de la primera y «Crear mi lista de regalos» en la última.
   Fondos alternados: blanca, gris clarito y blanca. Sin portada ni animación, sin preguntas frecuentes y sin cierre. */
export function GiftListPage() {
  useReveal();
  return <>
    <a className="skip-link" href="#main">Ir al contenido</a>
    <FloatNav />
    <main id="main" className="lr">
      <section className="duo-section" id="regalos" aria-label="Cómo funciona la lista de regalos"><div className="duo-split is-path"><div className="duo-panel">
        <GiftFeatures level={2} heading={<h1>Lista de regalos</h1>} endCta={<Button variant="seed" asChild><Link to="/crear/cuenta">Crear mi lista de regalos</Link></Button>} />
      </div></div></section>
    </main>
    <SiteFooter />
  </>;
}
