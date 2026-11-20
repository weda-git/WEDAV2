import { Link } from '@tanstack/react-router';
import { WedaLogo } from '@/components/weda-logo';

/** Pie de la landing y de las páginas informativas (por ejemplo /lista-de-regalos), sobre negro (pedido de la dueña, 2026-11-20).
 *  A la izquierda, la marca y la frase en grande; a la derecha, columnas con un título chico: Producto, Legal y Contacto.
 *  Solo enlaces que llevan a una página propia: «Sitio del casamiento», «Confirmación de asistencia» y «Ver ejemplo» se sacaron. */
export function SiteFooter() {
  return (
    <footer className="seed-footer"><div className="section-inner">
      <div className="footer-top">
        <div className="footer-brand">
          <a href="/" className="seed-logo" aria-label="Weda, inicio"><WedaLogo /></a>
          <p className="footer-mission">Tu casamiento empieza antes del gran día.</p>
        </div>
        <div className="footer-cols">
          <nav className="footer-nav" aria-labelledby="footer-h-producto">
            <p className="footer-head" id="footer-h-producto">Producto</p>
            <Link to="/lista-de-regalos">Lista de regalos</Link>
          </nav>
          <nav className="footer-nav" aria-labelledby="footer-h-legal">
            <p className="footer-head" id="footer-h-legal">Legal</p>
            <Link to="/terminos">Términos y condiciones</Link>
            <Link to="/privacidad">Privacidad</Link>
          </nav>
          <nav className="footer-nav" aria-labelledby="footer-h-contacto">
            <p className="footer-head" id="footer-h-contacto">Contacto</p>
            <a href="mailto:hola@weda.app">hola@weda.app</a>
          </nav>
        </div>
      </div>
      <div className="footer-bottom"><span>© 2026 Weda</span></div>
    </div></footer>
  );
}
