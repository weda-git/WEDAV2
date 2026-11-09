import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowRight, Search, X } from 'lucide-react';
import { FloatNav } from '@/components/float-nav';
import { wedding } from '@/lib/demo-wedding';
import { pageMeta } from '@/lib/site';
import { invitationPath } from '@/lib/weda/logic';

export const Route = createFileRoute('/encontrar')({
  head: () => {
    const { meta } = pageMeta({ title: 'Encontrá un casamiento • Weda', description: 'Buscá a los novios por su nombre y entrá a su invitación, su lista de regalos y la confirmación de asistencia.' });
    // El listado identifica a personas: no debe indexarse.
    return { meta: [...meta, { name: 'robots', content: 'noindex, nofollow' }] };
  },
  component: Find,
});

/* Pantalla de invitados: buscar a los novios por su nombre (boceto 2026-11-08, pedido de la dueña).
   OJO: la búsqueda real todavía no existe (falta el endpoint y la decisión de privacidad D5, docs/auditoria-ux-conversion/backend-dependencies.md).
   Mientras tanto, buscar por nombre muestra «no encontramos» y un link pegado igual abre la invitación. No publicar este boceto sin la búsqueda real. */
function Find() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [searched, setSearched] = useState('');
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (q.length < 2) { setError('Escribí el nombre de uno de los novios.'); return; }
    const path = invitationPath(q);
    if (path) { void navigate({ to: path as never }); return; }
    setSearched(q);
  };
  return (
    <div className="find">
      <a className="skip-link" href="#buscar">Ir al formulario</a>
      <section className="find-hero" aria-labelledby="find-title">
        <img className="find-hero-img" src={wedding.photo} alt="" />
        <FloatNav back />
        <div className="find-hero-copy">
          <h1 id="find-title">Encontrá un casamiento</h1>
          <p>Buscá a los novios por su nombre.</p>
        </div>
      </section>
      <main id="buscar" className="find-main">
        <form className="find-form" onSubmit={go} noValidate>
          <label htmlFor="find-q" className="find-sr">Nombres de los novios</label>
          <div className="find-field">
            <Search className="find-icon" size={20} aria-hidden="true" />
            <input id="find-q" type="search" value={value} onChange={e => { setValue(e.target.value); setError(''); setSearched(''); }} placeholder="Por ejemplo, Ana y Leo" autoComplete="off" enterKeyHint="search" aria-invalid={!!error} aria-describedby={error ? 'find-err' : undefined} />
            {value && <button type="button" className="find-clear" aria-label="Borrar" onClick={() => { setValue(''); setError(''); setSearched(''); }}><X size={18} aria-hidden="true" /></button>}
          </div>
          {error && <p className="find-error" id="find-err" role="alert">{error}</p>}
          <button type="submit" className="find-go">Buscar <ArrowRight size={16} aria-hidden="true" /></button>
        </form>
        {searched && <p className="find-none" role="status">No encontramos ningún casamiento con «{searched}».</p>}
      </main>
    </div>
  );
}

