import { useCallback, useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { api, ApiFailure, errorText } from '@/lib/weda/remote';
import { accountState, shortDate } from '@/components/admin/format';

export const Route = createFileRoute('/admin/')({ component: Accounts });

type Account = { id: string; email: string; createdAt: string; names: string; planId: string | null; publication: string | null; suspendedAt: string | null };

/* Lista de cuentas (CA-2): la más nueva arriba, con búsqueda por correo o nombres de la pareja. */
function Accounts() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Account[] | null>(null);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (text: string, p: number) => {
    setError(null);
    try {
      const r = await api<{ accounts: Account[]; hasMore: boolean }>('GET', `/api/admin/accounts?q=${encodeURIComponent(text)}&page=${p}`);
      setRows(prev => (p === 0 ? r.accounts : [...(prev ?? []), ...r.accounts]));
      setMore(r.hasMore);
    } catch (e) { setError(errorText(e instanceof ApiFailure ? e.code : 'network')); }
  }, []);
  useEffect(() => { void load(query, page); }, [load, query, page]);

  return (
    <>
      <div>
        <h1>Cuentas</h1>
        <p className="pn-sub">Todas las cuentas registradas en Weda.</p>
      </div>
      <form className="adm-search" role="search" onSubmit={e => { e.preventDefault(); setPage(0); setQuery(q.trim()); }}>
        <label htmlFor="adm-q" className="pn-sr">Buscar por correo o nombres</label>
        <input id="adm-q" type="search" placeholder="Buscar por correo o nombres" value={q} onChange={e => setQ(e.target.value)} />
        <button type="submit" className="pn-btn">Buscar</button>
      </form>
      {error && <p className="adm-msg is-error" role="alert">{error}</p>}
      {rows === null ? <p className="pn-muted">Cargando…</p>
        : rows.length === 0 ? <p className="pn-muted">{query ? 'No hay cuentas que coincidan.' : 'Todavía no hay cuentas.'}</p>
        : (
          <ul className="adm-list">
            {rows.map(a => {
              const st = accountState(a);
              return (
                <li key={a.id}>
                  <Link to="/admin/$userId" params={{ userId: a.id }} className="adm-row">
                    <span className="adm-row-main">
                      <strong>{a.names || 'Sin nombres todavía'}</strong>
                      <span>{a.email} · alta {shortDate(a.createdAt)}</span>
                    </span>
                    <span className={`adm-state${st.cls}`}>{st.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      {more && <button type="button" className="pn-btn is-ghost" onClick={() => setPage(p => p + 1)}>Ver más</button>}
    </>
  );
}
