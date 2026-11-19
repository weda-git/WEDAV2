import { createFileRoute } from '@tanstack/react-router';
import { GiftListPage } from '@/components/gift-list-page';
import { absolute, pageMeta, SITE_NAME } from '@/lib/site';

/* Página informativa de la lista de regalos: portada con el botón para crear la lista, las tres ventajas como hojas apiladas (antes estaban en
   la landing) y el cierre. Sin preguntas frecuentes (pedido de la dueña, 2026-11-19). No figura en el menú de arriba: se llega desde el pie y
   desde buscadores. SEO y GEO: un solo h1, un párrafo inicial que define qué es y los datos estructurados WebPage. Todo lo que dice sale del producto real (PRODUCT.md): el regalo es una
   transferencia al alias de los novios con comprobante, Weda no cobra ni mueve dinero y el pago con tarjeta todavía no existe. */

const PATH = '/lista-de-regalos';
const TITLE = 'Lista de regalos de casamiento online • Weda';
const DESCRIPTION = 'Armá la lista de regalos de tu casamiento, vinculá tu cuenta y recibí los regalos por transferencia, con el comprobante y el nombre de quien te regaló.';

export const Route = createFileRoute('/lista-de-regalos')({
  head: () => {
    const { meta, links } = pageMeta({ title: TITLE, description: DESCRIPTION, path: PATH });
    const pageLd = { '@context': 'https://schema.org', '@type': 'WebPage', name: TITLE, description: DESCRIPTION, url: absolute(PATH), isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: absolute('/') } };
    return {
      meta, links,
      scripts: [pageLd].map(d => ({ type: 'application/ld+json', children: JSON.stringify(d) })),
    };
  },
  component: GiftListPage,
});
