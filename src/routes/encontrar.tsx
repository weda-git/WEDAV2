import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, Search, X } from 'lucide-react';
import { FloatNav } from '@/components/float-nav';
import { wedding } from '@/lib/demo-wedding';
import { pageMeta } from '@/lib/site';
import { invitationPath } from '@/lib/weda/logic';
import { api, ApiFailure, errorText } from '@/lib/weda/remote';

export const Route = createFileRoute('/encontrar')({
  head: () => {
    const { meta } = pageMeta({ title: 'Encontrá un casamiento • Weda', description: 'Buscá a los novios por su nombre y entrá a su invitación, su lista de regalos y la confirmación de asistencia.' });
    // El listado identifica a personas: no debe indexarse.
    return { meta: [...meta, { name: 'robots', content: 'noindex, nofollow' }] };
  },
  component: Find,
});

/* Pantalla de invitados: buscar a los novios por su nombre (LAN-08, D-08: todos los casamientos publicados). Un link pegado sigue abriendo la
   invitación (LAN-04). Cada resultado muestra solo lo público: nombres, fecha y enlace al sitio. */
type Result = { names: string; dateLabel: string | null; path: string };
function Find() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<{ q: string; list: Result[] } | null>(null);
  const reset = () => { setError(''); setResults(null); };
  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    const path = invitationPath(q);
    if (path) { void navigate({ to: path as never }); return; }
    if (q.replace(/\s+y\s+|&/gi, '').replace(/\s/g, '').length < 3) { setError('Escribí al menos 3 letras del nombre de uno de los novios.'); return; }
    setBusy(true); reset();
    try { const r = await api<{ results: Result[] }>('GET', `/api/search?q=${encodeURIComponent(q)}`); setResults({ q, list: r.results }); }
    catch (err) { setError(errorText(err instanceof ApiFailure ? err.code : 'network')); }
    finally { setBusy(false); }
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
        <form className="find-form" onSubmit={e => void go(e)} noValidate>
          <label htmlFor="find-q" className="find-sr">Nombres de los novios</label>
          <div className="find-field">
            <Search className="find-icon" size={20} aria-hidden="true" />
            <input id="find-q" type="search" value={value} onChange={e => { setValue(e.target.value); reset(); }} placeholder="Por ejemplo, Ana y Leo" autoComplete="off" enterKeyHint="search" aria-invalid={!!error} aria-describedby={error ? 'find-err' : undefined} />
            {value && <button type="button" className="find-clear" aria-label="Borrar" onClick={() => { setValue(''); reset(); }}><X size={18} aria-hidden="true" /></button>}
          </div>
          {error && <p className="find-error" id="find-err" role="alert">{error}</p>}
          <button type="submit" className="find-go" disabled={busy} aria-busy={busy}>{busy ? 'Buscando…' : <>Buscar <ArrowRight size={16} aria-hidden="true" /></>}</button>
        </form>
        {results && (results.list.length === 0
          ? <p className="find-none" role="status">No encontramos ningún casamiento con «{results.q}».</p>
          : <ul className="find-results" aria-label="Casamientos encontrados">
              {results.list.map(r => (
                <li key={r.path}><Link to={r.path as never} className="find-result"><span><strong>{r.names.replace(/\s*&\s*/, ' y ')}</strong>{r.dateLabel && <small>{r.dateLabel}</small>}</span><ArrowRight size={18} aria-hidden="true" /></Link></li>
              ))}
            </ul>)}
      </main>
    </div>
  );
}

