import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloatNav } from '@/components/float-nav';
import { GiftDemo } from '@/components/feature-demos';
import { SiteFooter } from '@/components/site-footer';
import { GiftFeatures } from '@/components/gift-features';
import { useReveal } from '@/lib/reveal';
// Los estilos de esta página viajan con su código (no con la landing, auditoría F-06).
import '@/lista-regalos.css';

const Cta = ({ children = 'Crear mi lista de regalos' }: { children?: string }) => (
  <Button variant="seed" asChild><Link to="/crear/cuenta">{children}</Link></Button>
);

export function GiftListPage() {
  useReveal();
  return <>
    <a className="skip-link" href="#main">Ir al contenido</a>
    <FloatNav />
    <main id="main" className="lr">
      <section className="lr-hero" aria-labelledby="lr-title">
        <div className="lr-inner lr-hero-grid">
          <div className="lr-hero-copy">
            <p className="eyebrow">Lista de regalos</p>
            <h1 id="lr-title">La lista de regalos de tu casamiento, directo a tu cuenta.</h1>
            <p className="lr-lead">Una lista de regalos online es una página con los regalos que eligieron, que se comparte con un link. En Weda la armás gratis, vinculás tu cuenta y tus invitados regalan por transferencia, con el comprobante y su mensaje.</p>
            <div className="lr-actions"><Cta /><Button variant="seedLink" asChild><Link to="/ejemplo/regalos"><span>Ver una lista de ejemplo</span><ArrowRight size={15} /></Link></Button></div>
          </div>
          <div className="lr-hero-demo" aria-hidden="true"><span className="fd-stage"><GiftDemo /></span></div>
        </div>
      </section>

      {/* Las tres ventajas como hojas apiladas, igual que estaban en la landing (se mudaron acá, pedido de la dueña, 2026-11-19); el botón cierra la última. */}
      <section className="duo-section" id="regalos" aria-label="Cómo funciona la lista de regalos"><div className="duo-split is-path"><div className="duo-panel">
        <GiftFeatures level={2} label="Lista de regalos" endCta={<Cta />} />
      </div></div></section>

      <section className="closing-section" aria-labelledby="lr-closing-title"><div className="section-inner closing-inner">
        <h2 id="lr-closing-title">Armá tu lista de regalos gratis y pagá recién al publicarla.</h2>
        <div className="closing-actions"><Cta /></div>
      </div></section>
    </main>
    <SiteFooter />
  </>;
}
