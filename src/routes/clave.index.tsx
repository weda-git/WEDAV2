import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { isEmail } from '@/lib/weda/logic';
import { api, ApiFailure, errorText } from '@/lib/weda/remote';
import { useHydrated } from '@/lib/weda/store';
import { pageMeta } from '@/lib/site';

/* Recuperar la clave, paso 1: pedir el enlace por correo. La respuesta es la misma exista o no la cuenta (el servidor no lo revela). */
export const Route = createFileRoute('/clave/')({
  head: () => {
    const { meta } = pageMeta({ title: 'Recuperar la clave • Weda', description: 'Pedí un enlace para elegir una clave nueva.', path: '/clave' });
    return { meta: [...meta, { name: 'robots', content: 'noindex, nofollow' }] };
  },
  component: Forgot,
});

function Forgot() {
  const hydrated = useHydrated();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmail(email)) { setError('Ingresá un correo válido, por ejemplo nombre@correo.com.'); document.getElementById('fg-email')?.focus(); return; }
    setState('busy'); setError(undefined);
    try { await api('POST', '/api/auth/forgot', { email: email.trim() }); setState('sent'); }
    catch (err) { setState('idle'); setError(errorText(err instanceof ApiFailure ? err.code : 'network')); }
  };
  return (
    <main className="fg-page">
      <div className="fg-box">
        <h1 className="fg-title">¿Olvidaste tu clave?</h1>
        <p className="fg-lead">{state === 'sent' ? 'Listo. Revisá tu correo.' : 'No pasa nada. Te mandamos un correo para elegir una nueva.'}</p>
        <hr className="fg-rule" />
        {state === 'sent' ? (
          <>
            <p className="fg-note" role="status">Si hay una cuenta con <strong>{email.trim()}</strong>, te llega un correo con el enlace. Vale por una hora. Si no lo ves, revisá la carpeta de spam.</p>
            <Link to="/crear/cuenta" search={{ modo: 'ingresar' }} className="fg-btn">Volver a ingresar</Link>
          </>
        ) : (
          <form onSubmit={submit} noValidate className="fg-form">
            <label htmlFor="fg-email" className="fg-sr">Correo electrónico</label>
            <input id="fg-email" className="fg-input" type="email" inputMode="email" autoComplete="email" placeholder="Correo electrónico" value={email}
              onChange={e => { setEmail(e.target.value); setError(undefined); }} aria-invalid={!!error} aria-describedby={error ? 'fg-email-e' : undefined} />
            {error && <p className="fg-error" id="fg-email-e" role="alert">{error}</p>}
            <button type="submit" className="fg-btn" disabled={state === 'busy' || !hydrated} aria-busy={state === 'busy'}>{state === 'busy' ? 'Un momento…' : 'Mandarme el enlace'}</button>
            <Link to="/crear/cuenta" search={{ modo: 'ingresar' }} className="fg-back">Volver a ingresar</Link>
          </form>
        )}
      </div>
    </main>
  );
}
