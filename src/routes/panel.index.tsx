import { useEffect, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, ChevronRight, Gift, LayoutGrid, Lock, Users } from 'lucide-react';
import { CoupleDialog } from '@/components/panel/couple-form';
import { GetStarted } from '@/components/panel/get-started';
import { coupleLabel } from '@/lib/weda/logic';
import { operates, planForOperation, type Operation } from '@/lib/weda/plans';
import { useRemote } from '@/lib/weda/remote';
import { useAppState } from '@/lib/weda/store';

export const Route = createFileRoute('/panel/')({
  // «?editar=datos» abre «Datos del casamiento» al entrar (lo usa el pendiente «Definí la fecha» del diálogo de publicar).
  validateSearch: (q: Record<string, unknown>): { editar?: 'datos' } => (q['editar'] === 'datos' ? { editar: 'datos' } : {}),
  component: Home,
});

/* Inicio (diseño de la dueña, 2026-10-28; rediseño 2026-11-21): encabezado con los nombres y la foto de la pareja, el avance y los tres pasos
   (regalos → sitio → publicación) con el paso actual destacado y, separada, la organización que no se publica.
   Sin la foto en arco (2026-11-21): repetía la del perfil y se metía en el bloque de pasos. */
function Home() {
  const s = useAppState();
  const access = useRemote().access;
  const navigate = useNavigate();
  const { editar } = Route.useSearch();
  const [editing, setEditing] = useState(editar === 'datos');
  // Ya estando en el Inicio (por ejemplo, desde el diálogo de publicar) el parámetro cambia sin montar la pantalla de nuevo: se abre igual.
  useEffect(() => { if (editar === 'datos') setEditing(true); }, [editar]);
  const closeEditing = () => { setEditing(false); if (editar) void navigate({ to: '/panel', search: {}, replace: true }); };

  type Tile = { key: string; title: string; text: string; Icon: typeof Gift; tone?: string; to?: string; search?: Record<string, string>; op?: Operation; onClick?: () => void };
  /* Administración de fondo. No se publica y no hace falta para publicar. */
  const manage: Tile[] = [
    { key: 'invitados', title: 'Invitados', text: 'Cargá tu lista y seguí las confirmaciones.', Icon: Users, to: '/panel/invitados', op: 'guests' },
    { key: 'mesas', title: 'Mesas y grupos', text: 'Organizá dónde se sienta cada persona.', Icon: LayoutGrid, to: '/panel/invitados', search: { vista: 'mesas' }, op: 'groups' },
  ];

  const renderTile = ({ title, text, Icon, tone, to, search, op, onClick }: Tile) => {
    // Se ven y se recorren siempre; operar exige Celebración publicada y vigente (BR-62).
    const locked = !!op && !operates(access, op);
    const body = (
      <>
        <span className={`hm-ico${tone ? ` is-${tone}` : ''}`} aria-hidden="true"><Icon size={22} strokeWidth={1.5} /></span>
        <span className="hm-text">
          <strong>{title}</strong>
          <span>{text}</span>
          {locked && <em className="hm-tag is-lock"><Lock size={12} aria-hidden="true" /> Se habilita con {planForOperation(op)?.name}</em>}
        </span>
        <ArrowRight size={18} className="hm-go is-arrow" aria-hidden="true" />
        <ChevronRight size={20} className="hm-go is-chev" aria-hidden="true" />
      </>
    );
    return to
      ? <Link to={to as never} {...(search ? { search: search as never } : {})} className="hm-tile">{body}</Link>
      : <button type="button" className="hm-tile" onClick={onClick}>{body}</button>;
  };

  return (
    <div className="pn-page pn-journey hx-home">
      <header className="hx-hero">
        <div className="hx-hero-copy">
          <p className="hx-couple">{coupleLabel(s.couple)}</p>
          <h1>Hola de nuevo</h1>
        </div>
      </header>

      <GetStarted />

      {/* Rediseño 2026-11-21: los accesos «Diseñá tu invitación» y «Elegí qué publicar» repetían los pasos 2 y 3 de arriba; se sacaron
          (siguen en los pasos, en el menú y en «Publicar»). La organización queda como una lista liviana, separada de lo que se publica. */}
      <section className="hm-manage" aria-labelledby="hm-manage-title">
        <div className="hm-head">
          <h2 id="hm-manage-title">Organización</h2>
          <p className="pn-sub">No se publica: es para vos.</p>
        </div>
        <ul className="hm-grid">
          {manage.map(tile => <li key={tile.key}>{renderTile(tile)}</li>)}
        </ul>
      </section>

      {editing && <CoupleDialog open onClose={closeEditing} />}
    </div>
  );
}
