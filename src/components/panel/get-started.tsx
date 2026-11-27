// Pasos del Inicio: lista de regalos → diseño del sitio → publicación. Cada paso se marca solo, según los datos reales (journey.ts).
// Rediseño 2026-11-21 (pedido de la dueña: «repensala de cero»): una lista vertical con los tres pasos a la vista, sin pestañas.
// - El paso actual se destaca: qué falta, en una línea, y un solo botón principal.
// - Los pasos hechos llevan tilde, «Listo» y un enlace discreto para editarlos.
// - Los que vienen quedan apagados, con una línea de qué van a pedir.
// - Publicar es la meta: cuando le toca, usa el verde de la marca; publicada, muestra el enlace.
import { Link } from '@tanstack/react-router';
import { ArrowRight, ArrowUpRight, Check, Eye } from 'lucide-react';
import { usePlans } from '@/components/panel/ui';
import { sitePath } from '@/lib/weda/logic';
import { giftsStage, nextAction, siteStage } from '@/lib/weda/journey';
import { isLive } from '@/lib/weda/payments';
import { openPreview } from '@/lib/weda/preview-event';
import { useAppState } from '@/lib/weda/store';

type Key = 'regalos' | 'sitio' | 'publicar';
type Step = { key: Key; title: string; done: boolean; now: string; later: string; doneText: string };

/** Anillo de avance: cuántos de los tres pasos están listos. */
function Ring({ done }: { done: number }) {
  const r = 20, c = 2 * Math.PI * r;
  return (
    <svg className="hs-ring" viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
      <circle cx="24" cy="24" r={r} className="hs-ring-track" />
      <circle cx="24" cy="24" r={r} className="hs-ring-fill" strokeDasharray={c} strokeDashoffset={c * (1 - done / 3)} />
      <text x="24" y="28" textAnchor="middle">{done}/3</text>
    </svg>
  );
}

export function GetStarted() {
  const s = useAppState();
  const plans = usePlans();
  const g = giftsStage(s), si = siteStage(s), live = isLive(s);
  const next = nextAction(s);
  const noGifts = s.gifts.items.length === 0;

  const steps: Step[] = [
    { key: 'regalos', title: 'Lista de regalos', done: g.status === 'done',
      now: noGifts ? 'Elegí un set completo o los regalos uno por uno, y cómo querés recibirlos.' : g.detail,
      later: 'Los regalos y cómo te llegan.', doneText: g.detail },
    { key: 'sitio', title: 'Tu sitio', done: si.status === 'done',
      now: si.status === 'todo' ? 'Cargá lugares y horarios, y elegí las secciones que querés mostrar.' : si.detail,
      later: 'Lugares, horarios y lo que quieras contar.', doneText: si.detail },
    { key: 'publicar', title: 'Publicar', done: live,
      now: 'Mirá cómo queda y elegí si publicás solo la lista de regalos o la invitación completa.',
      later: 'Tu link para compartir con los invitados.', doneText: `Tu sitio está en línea: ${sitePath(s)}` },
  ];
  const current = steps.find(x => !x.done)?.key ?? null;
  const doneCount = steps.filter(x => x.done).length;

  const primary = (x: Step) => {
    if (x.key === 'regalos') {
      const cta = noGifts ? 'Armar mi lista' : next.stage === 'regalos' ? next.cta : 'Continuar';
      return <Link to="/panel/regalos" {...(next.stage === 'regalos' && next.search ? { search: next.search as never } : {})} className="pn-btn hs-cta">{cta}<ArrowRight size={16} aria-hidden="true" /></Link>;
    }
    if (x.key === 'sitio') return <Link to="/panel/sitio" className="pn-btn hs-cta">{si.status === 'todo' ? 'Armar mi sitio' : 'Continuar'}<ArrowRight size={16} aria-hidden="true" /></Link>;
    return (
      <>
        <button type="button" className="pn-btn hs-cta is-goal" onClick={plans.open}>Publicar<ArrowRight size={16} aria-hidden="true" /></button>
        <button type="button" className="pn-btn is-ghost" onClick={() => openPreview('home')}><Eye size={16} aria-hidden="true" />Vista previa</button>
      </>
    );
  };
  const side = (x: Step) => {
    if (x.key === 'publicar') return x.done ? <a className="hs-side" href={sitePath(s)} target="_blank" rel="noreferrer">Ver mi sitio<ArrowUpRight size={14} aria-hidden="true" /></a> : null;
    const to = x.key === 'regalos' ? '/panel/regalos' : '/panel/sitio';
    return <Link to={to} className="hs-side">{x.done ? 'Editar' : 'Ver'}<span className="pn-sr"> {x.title}</span></Link>;
  };

  return (
    <section className="hs" aria-labelledby="hs-title">
      <header className="hs-head">
        <div>
          <h2 id="hs-title">Tu casamiento en tres pasos</h2>
          <p>{doneCount === 3 ? 'Todo listo. Ya podés compartir tu link.' : doneCount === 0 ? 'Empezá por el primero: lo demás se arma solo.' : `${doneCount} de 3 listos. Falta poco.`}</p>
        </div>
        <Ring done={doneCount} />
      </header>
      <ol className="hs-list">
        {steps.map((x, i) => {
          const state = x.done ? 'is-done' : x.key === current ? 'is-current' : 'is-next';
          return (
            <li key={x.key} className={`hs-item ${state}${x.key === 'publicar' ? ' is-goal' : ''}`} aria-current={x.key === current ? 'step' : undefined}>
              <span className="hs-mark" aria-hidden="true">{x.done ? <Check size={15} strokeWidth={2.6} /> : i + 1}</span>
              <div className="hs-body">
                <h3>{x.title}</h3>
                <p>{x.done ? x.doneText : x.key === current ? x.now : x.later}</p>
                {x.key === current && <div className="hs-actions">{primary(x)}</div>}
              </div>
              {x.key !== current && side(x)}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
