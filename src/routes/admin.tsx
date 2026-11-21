import { useEffect, useState } from 'react';
import { createFileRoute, Link, Outlet } from '@tanstack/react-router';
import { api } from '@/lib/weda/remote';
import { WedaLogo } from '@/components/weda-logo';
import '@/panel.css';
import '@/admin.css';

/* ADM-01 · Administración de cuentas. Solo la cuenta de WEDA_ADMIN_EMAIL: para cualquier otra (o sin sesión) se ve la página de «no existe»,
   igual que el servidor responde 404. La autorización real la hace el servidor en cada pedido (/api/admin/*). */
export const Route = createFileRoute('/admin')({
  head: () => ({ meta: [{ title: 'Administración • Weda' }, { name: 'robots', content: 'noindex, nofollow' }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const [state, setState] = useState<'loading' | 'ok' | 'no'>('loading');
  useEffect(() => {
    api<{ admin?: boolean }>('GET', '/api/me').then(m => setState(m.admin ? 'ok' : 'no'), () => setState('no'));
  }, []);
  if (state === 'loading') return <div className="adm pn-root"><p className="pn-loading">Cargando…</p></div>;
  if (state === 'no') return (
    <main className="adm pn-root"><div className="adm-main">
      <h1>Esta página no existe</h1>
      <p className="pn-muted">La dirección que buscás no existe o se movió.</p>
      <Link to="/" className="pn-link">Ir al inicio</Link>
    </div></main>
  );
  return (
    <div className="adm pn-root">
      <div className="adm-main">
        <header className="adm-top">
          <Link to="/admin" className="seed-logo" aria-label="Administración de Weda"><WedaLogo /></Link>
          <span className="adm-badge">Administración</span>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
