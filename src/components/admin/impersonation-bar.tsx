import { useEffect, useState } from 'react';
import { api, useRemote } from '@/lib/weda/remote';
import '@/admin.css';

/* ADM-01 · D5: mientras la administradora «entra como» una pareja, una franja fija lo dice, muestra cuánto queda y permite salir.
   Al salir o al vencer se recarga en la ficha de esa cuenta en /admin (la copia local de la pareja nunca se mezcla con la propia). */
export function ImpersonationBar() {
  const { impersonating } = useRemote();
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!impersonating) return;
    const tick = () => {
      const ms = Date.parse(impersonating.expiresAt) - Date.now();
      setLeft(ms);
      if (ms <= 0) window.location.assign('/admin');
    };
    tick();
    const t = window.setInterval(tick, 15_000);
    return () => window.clearInterval(t);
  }, [impersonating]);
  if (!impersonating) return null;
  const exit = async () => {
    let target: string | null = null;
    try { target = (await api<{ userId: string | null }>('POST', '/api/admin/impersonation/end')).userId; } catch { /* igual se sale */ }
    window.location.assign(target ? `/admin/${target}` : '/admin');
  };
  const mins = left === null ? null : Math.max(0, Math.ceil(left / 60_000));
  return (
    <div className="adm-as" role="status">
      <span>Estás viendo la cuenta de <strong>{impersonating.email}</strong>{mins !== null && <> · quedan {mins} min</>}</span>
      <button type="button" className="adm-as-exit" onClick={() => { void exit(); }}>Salir</button>
    </div>
  );
}
