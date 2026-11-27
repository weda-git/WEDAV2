import { useEffect, useRef, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowDown, ArrowLeft, Type, ArrowUp, CalendarClock, CalendarDays, Check, ChevronDown, ChevronRight, Eye, CircleAlert, ExternalLink, EyeOff, Gift as GiftIcon, MapPin, Image as ImageIcon, Images, MessageSquareText, Music, Plus, Shirt, UserCheck, X, type LucideIcon } from 'lucide-react';
import { EVENT_ICONS, eventIcon } from '@/components/event-icons';
import { PlaceSearch } from '@/components/panel/place-search';
import { useKeyboardState } from '@/components/panel/live-card';
import { Field, useToast } from '@/components/panel/ui';
import { placesEnabled } from '@/lib/weda/google-places';
import { readImage } from '@/lib/weda/images';
import { resolvePhoto, photoPosition, DEFAULT_GIFTS_BUTTON, DEFAULT_GIFTS_TEXT, DEFAULT_GIFTS_TITLE, defaultColors, hasEventDetails, isHexColor, isSafeMapsUrl, mapsLink, moveBlock, sitePath, spotifyEmbed, uid, validateOnboarding } from '@/lib/weda/logic';
import { eventBlank, eventComplete } from '@/lib/weda/journey';
import { publishes, planFor, type Feature } from '@/lib/weda/plans';
import { openPreview } from '@/lib/weda/preview-event';
import { update, useAppState } from '@/lib/weda/store';
import type { AppState, BlockId, SiteConfig, SiteEvent } from '@/lib/weda/types';

export const Route = createFileRoute('/panel/sitio')({ component: SiteEditor });

/** Horarios cada 15 minutos (siempre en punto: 20:00, no 20:01). */
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`);
const MAX_PHOTOS = 6;

/** «Incluido en <plan>»: solo para funciones que NO están en el plan base del sitio (lo que realmente diferencia los planes). */
const tagFor = (f: Feature): string | undefined => {
  const p = planFor(f), base = planFor('site');
  return p && base && p.id !== base.id ? `Incluido en ${p.name}` : undefined;
};

/** Cada cambio del editor se guarda al instante en el estado local; la vista previa lo toma sin recargar. */
const patchSite = (fn: (s: SiteConfig) => SiteConfig) => update(x => ({ ...x, site: fn(x.site) }));

/** Secciones del editor. «Eventos» agrupa los momentos del día (ceremonia, recepción…): cada uno se prende y edita por separado. */
type SectionId = 'portada' | 'fecha' | 'eventos' | 'regalos' | 'rsvp' | 'dress' | 'texto' | 'fotos' | 'mensaje' | 'musica';
type Tone = 'ok' | 'todo' | 'off';
type Sec = { id: SectionId; label: string; title: string; status: string; tone: Tone };
const ICON: Record<SectionId, LucideIcon> = { portada: ImageIcon, fecha: CalendarClock, eventos: CalendarDays, regalos: GiftIcon, rsvp: UserCheck, dress: Shirt, texto: Type, fotos: Images, mensaje: MessageSquareText, musica: Music };
/** Dónde está cada sección en la página pública (para llevar la vista previa hasta ahí). */
const ANCHOR: Record<SectionId, string> = { portada: '', fecha: 'save-the-date', eventos: 'dia', regalos: 'regalos', rsvp: 'confirmar', dress: 'dresscode', texto: 'texto', fotos: 'fotos', mensaje: 'iv-close-title', musica: 'musica' };
/** Estado de la sección con forma además de color: tilde = lista, aviso = falta algo, ojo tachado = oculta o fuera del plan. */
const STATUS_ICON: Record<Tone, LucideIcon> = { ok: Check, todo: CircleAlert, off: EyeOff };
/** Para qué sirve cada sección, en una línea (se muestra en «Para agregar»). */
/** Qué trae cada sección, en una línea (rediseño 2026-11-25): se ve en la lista, en «Sumá más secciones» y al abrirla. */
const PURPOSE: Record<SectionId, string> = {
  portada: 'Tu foto, sus nombres y la fecha. Es lo primero que ven.',
  fecha: 'La fecha bien grande y cuántos días faltan.',
  eventos: 'Cada momento del día: lugar, horario y cómo llegar.',
  regalos: 'Un acceso directo a tu lista de regalos.',
  rsvp: 'Un botón para que confirmen si van.',
  dress: 'Cómo vestirse, con colores sugeridos.',
  texto: 'Un mensaje tuyo: un aviso, una historia, lo que quieras.',
  fotos: 'Hasta 6 fotos de ustedes, con hashtag e Instagram.',
  musica: 'Tu playlist de Spotify, para escuchar antes de la fiesta.',
  mensaje: 'Unas palabras de cierre al final del sitio.',
};
/** Las secciones que se pueden reordenar y su id en el orden guardado. */
const BLOCK_SECTION: Record<BlockId, SectionId> = { fecha: 'fecha', eventos: 'eventos', regalos: 'regalos', rsvp: 'rsvp', dress: 'dress', texto: 'texto', fotos: 'fotos', musica: 'musica', mensaje: 'mensaje' };
const photoWord = (n: number) => `${n} ${n === 1 ? 'foto' : 'fotos'}`;

/** Estado de cada sección, derivado de los datos reales (misma regla que el Inicio: eventComplete/sectionGaps). */
function sectionsOf(s: AppState): Sec[] {
  const site = s.site;
  const on = site.events.filter(e => e.enabled);
  const done = site.events.filter(eventComplete);
  const gaps = on.filter(e => !eventComplete(e) && !eventBlank(e));
  const dressOk = site.dressCode.title.trim() !== '' || site.dressCode.text.trim() !== '';
  const list: Sec[] = [
    { id: 'portada', label: 'Portada', title: 'Portada', status: s.date ? 'Completa' : 'Falta la fecha', tone: s.date ? 'ok' : 'todo' },
    { id: 'fecha', label: 'Save the date', title: 'Save the date', status: s.date ? (site.countdown ? 'Con contador' : 'Sin contador') : 'Sin fecha todavía', tone: s.date ? 'ok' : 'off' },
    { id: 'eventos', label: 'Eventos', title: 'Eventos', status: on.length === 0 ? 'Sin eventos' : gaps.length > 0 ? 'Falta completar' : done.length === 0 ? 'Sin cargar' : `${done.length} ${done.length === 1 ? 'listo' : 'listos'}`, tone: on.length === 0 ? 'off' : gaps.length > 0 || done.length === 0 ? 'todo' : 'ok' },
    { id: 'rsvp', label: 'Confirmación', title: 'Confirmación de asistencia', status: site.rsvp.enabled ? 'Visible' : 'Oculta', tone: site.rsvp.enabled ? 'ok' : 'off' },
    { id: 'dress', label: 'Dress code', title: 'Dress code', status: !site.dressCode.enabled ? 'Oculta' : dressOk ? 'Completa' : 'Falta completar', tone: !site.dressCode.enabled ? 'off' : dressOk ? 'ok' : 'todo' },
  ];
  const gifts = s.gifts.items.length;
  list.push({ id: 'regalos', label: 'Regalos', title: 'Regalos', status: !site.giftsSection.enabled ? 'Oculta' : gifts === 0 ? 'Todavía sin regalos' : `${gifts} ${gifts === 1 ? 'regalo' : 'regalos'}`, tone: !site.giftsSection.enabled ? 'off' : gifts === 0 ? 'todo' : 'ok' });
  const noteOk = site.note.title.trim() !== '' || site.note.text.trim() !== '';
  list.push({ id: 'texto', label: 'Texto libre', title: 'Texto libre', status: !site.note.enabled ? 'Oculta' : noteOk ? 'Completa' : 'Falta completar', tone: !site.note.enabled ? 'off' : noteOk ? 'ok' : 'todo' });
  list.push({ id: 'fotos', label: 'Fotos', title: 'Fotos', status: !site.gallery.enabled ? 'Oculta' : site.gallery.photos.length ? photoWord(site.gallery.photos.length) : 'Sin fotos', tone: !site.gallery.enabled ? 'off' : site.gallery.photos.length ? 'ok' : 'todo' });
  list.push({ id: 'mensaje', label: 'Mensaje final', title: 'Mensaje final', status: site.message.enabled ? 'Visible' : 'Oculta', tone: site.message.enabled ? 'ok' : 'off' });
  list.push((() => {
        const linked = !!spotifyEmbed(site.playlist.spotify), n = site.playlist.tracks.length;
        return { id: 'musica' as const, label: 'Playlist de Spotify', title: 'Playlist de Spotify', status: !site.playlist.enabled ? 'Oculta' : linked ? 'Conectada' : n ? `${n} temas` : 'Falta el link', tone: (!site.playlist.enabled ? 'off' : linked || n ? 'ok' : 'todo') as Tone };
      })());
  // Mismo orden de fábrica que la página: así «Para agregar» las muestra donde van.
  const rank: SectionId[] = ['portada', 'fecha', 'eventos', 'regalos', 'rsvp', 'dress', 'texto', 'fotos', 'musica', 'mensaje'];
  return list.sort((a, b) => rank.indexOf(a.id) - rank.indexOf(b.id));
}

/** La sección elegida: título, estado y solo sus campos. Agregar, quitar y ordenar viven en la estructura de la invitación. */
function Panel({ sec, planTag, children }: { sec: Sec; planTag?: string | undefined; children: React.ReactNode }) {
  return (
    <section className="pn-spanel ed-panel" aria-labelledby={`panel-${sec.id}`}>
      <h2 id={`panel-${sec.id}`} className="ed-panel-title">{sec.title}{planTag && <em className="pn-plantag">{planTag}</em>}</h2>
      {children}
    </section>
  );
}

/* Portada: foto, nombres, fecha y el texto sobre los nombres (puede quedar vacío). Todo se guarda al instante. */
function CoverFields() {
  const s = useAppState();
  const [first, setFirst] = useState(s.couple.first);
  const [second, setSecond] = useState(s.couple.second);
  const [noDate, setNoDate] = useState(!s.date);
  const [errors, setErrors] = useState<ReturnType<typeof validateOnboarding>>({});
  const [photoError, setPhotoError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const commitNames = () => {
    const found = validateOnboarding({ first, second, date: '', noDate: true });
    setErrors({ ...(found.first ? { first: found.first } : {}), ...(found.second ? { second: found.second } : {}) });
    if (!found.first && !found.second) update(x => ({ ...x, couple: { first: first.trim(), second: second.trim() } }));
  };
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError(''); setLoading(true);
    try { const img = await readImage(file); update(x => ({ ...x, photo: { kind: 'upload', ...img } })); }
    catch (e) { setPhotoError(e instanceof Error ? e.message : 'No pudimos cargar la foto.'); }
    finally { setLoading(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  // Portada (rediseño 2026-11-25): la foto grande, como se ve arriba de la página, con los nombres encima; los datos al lado.
  return (
    <div className="ed-cover">
      <div className="ed-cover-photo" style={{ backgroundImage: `url(${resolvePhoto(s.photo)})`, backgroundPosition: photoPosition(s.photo) ?? 'center' }}>
        <span className="ed-cover-names" aria-hidden="true">{s.couple.first || 'Nombre'} &amp; {s.couple.second || 'Nombre'}</span>
        <button type="button" className="ed-cover-change" onClick={() => fileRef.current?.click()} disabled={loading}>
          <ImageIcon size={16} strokeWidth={1.6} aria-hidden="true" />{loading ? 'Cargando…' : s.photo.kind === 'upload' ? 'Cambiar foto' : 'Subir tu foto'}
        </button>
        <input ref={fileRef} className="pn-sr" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => void pick(e.target.files?.[0])} aria-label="Elegir una foto de tu dispositivo" />
      </div>
      {photoError && <p className="pn-error" role="alert">{photoError}</p>}
      <div className="ed-cover-fields">
        <div className="pn-two">
          <Field label="Tu nombre" error={errors.first}>{a => <input type="text" id={a.id} value={first} onChange={e => setFirst(e.target.value)} onBlur={commitNames} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}</Field>
          <Field label="Nombre de tu pareja" error={errors.second}>{a => <input type="text" id={a.id} value={second} onChange={e => setSecond(e.target.value)} onBlur={commitNames} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}</Field>
        </div>
        <Field label="Fecha del casamiento">{a => <input type="date" id={a.id} value={noDate ? '' : s.date ?? ''} disabled={noDate} onChange={e => update(x => ({ ...x, date: e.target.value || null }))} />}</Field>
        <label className="pn-check"><input type="checkbox" checked={noDate} onChange={e => { setNoDate(e.target.checked); if (e.target.checked) update(x => ({ ...x, date: null })); }} /><span>Todavía no tenemos fecha</span></label>
        <Field label="Texto sobre los nombres" optional>{a => <input id={a.id} type="text" value={s.site.coverText} placeholder="Nos casamos" onChange={e => patchSite(x => ({ ...x, coverText: e.target.value }))} />}</Field>
      </div>
    </div>
  );
}


const SLOT: Record<string, number> = { ceremonia: 1, recepcion: 2, fiesta: 3, civil: 4, brunch: 5 };

/** Un momento del día (rediseño 2026-11-25): oculto = una fila con su interruptor; prendido = sus campos a la vista, sin desplegable. */
function EventRow({ ev }: { ev: SiteEvent }) {
  const set = (patch: Partial<SiteEvent>) => patchSite(s => ({ ...s, events: s.events.map(e => (e.key === ev.key ? { ...e, ...patch } : e)) }));
  const title = ev.title.trim() || `Evento ${SLOT[ev.key]}`;
  const EvIcon = eventIcon(ev.icon, 'rings');
  return (
    <li className={`pn-ev ed-ev${ev.enabled ? ' is-open' : ' is-off'}`}>
      <div className="pn-ev-head">
        <span className="ed-ev-ico" aria-hidden="true"><EvIcon size={24} strokeWidth={1.5} /></span>
        <span className="pn-ev-title" id={`sec-${ev.key}`}>{title}</span>
        <label className="ed-switch"><input type="checkbox" role="switch" checked={ev.enabled} onChange={e => set({ enabled: e.target.checked })} aria-label={`Mostrar ${title}`} /><span className="ed-switch-ui" aria-hidden="true" /></label>
      </div>
      {ev.enabled && (
        <div className="pn-ev-body ed-ev-body" id={`ev-body-${ev.key}`}>
          <div className="ed-ev-row is-time">
            <Field label="Nombre del evento">{a => <input id={a.id} type="text" value={ev.title} placeholder="Ceremonia, fiesta…" onChange={e => set({ title: e.target.value })} />}</Field>
            <Field label="Hora">{a => (
              <select id={a.id} value={ev.time} onChange={e => set({ time: e.target.value })}>
                <option value="">Sin horario</option>
                {(ev.time && !TIME_OPTIONS.includes(ev.time) ? [ev.time, ...TIME_OPTIONS].sort() : TIME_OPTIONS).map(t => <option key={t} value={t}>{t} hs</option>)}
              </select>
            )}</Field>
          </div>
          {placesEnabled() && (
            <PlaceSearch
              confirmed={ev.mapsUrl.trim() && isSafeMapsUrl(ev.mapsUrl) ? { name: ev.name, address: ev.address, mapsUrl: ev.mapsUrl.trim() } : null}
              onPick={p => set({ name: p.name, address: p.address, mapsUrl: p.mapsUrl })}
            />
          )}
          <div className="ed-ev-row">
            <Field label="Nombre del lugar">{a => <input id={a.id} type="text" value={ev.name} placeholder="Parroquia San Isidro" onChange={e => set({ name: e.target.value })} />}</Field>
            {!placesEnabled() && <Field label="Dirección">{a => <input id={a.id} type="text" value={ev.address} placeholder="Calle 123, Ciudad" onChange={e => set({ address: e.target.value, mapsUrl: '' })} />}</Field>}
          </div>
          <div className="ed-icons-grid is-compact" role="radiogroup" aria-label={`Ícono de ${title}`}>
            {EVENT_ICONS.map(i => (
              <label key={i.id} className={`ed-ico-opt${ev.icon === i.id ? ' on' : ''}`} title={i.label}>
                <input type="radio" name={`ico-${ev.key}`} className="pn-sr" checked={ev.icon === i.id} onChange={() => set({ icon: i.id })} aria-label={i.label} />
                <i.Icon size={22} strokeWidth={1.5} />
              </label>
            ))}
          </div>
          <Field label="Nota para los invitados" optional>{a => <input id={a.id} type="text" value={ev.note} placeholder="Ej.: hay estacionamiento" onChange={e => set({ note: e.target.value })} />}</Field>
        </div>
      )}
    </li>
  );
}


/** ¿La sección está en la invitación? (Una sección fuera del plan nunca está.) */
function isOn(s: AppState, id: SectionId): boolean {
  const site = s.site;
  switch (id) {
    case 'portada': return true;
    case 'fecha': return site.saveDate;            // sin fecha, el bloque espera («Sin fecha todavía»)
    case 'eventos': return site.events.some(e => e.enabled);
    case 'regalos': return site.giftsSection.enabled && publishes(s.planId, 'gifts');
    case 'texto': return site.note.enabled;
    case 'rsvp': return site.rsvp.enabled;
    case 'dress': return site.dressCode.enabled;
    case 'fotos': return site.gallery.enabled && publishes(s.planId, 'gallery');
    case 'mensaje': return site.message.enabled && publishes(s.planId, 'message');
    case 'musica': return site.playlist.enabled && publishes(s.planId, 'playlist');
  }
}
/** Agregar o quitar una sección: solo cambia si se muestra; todo lo que cargó la pareja se conserva. */
function setOn(id: SectionId, v: boolean) {
  patchSite(x => {
    switch (id) {
      case 'regalos': return { ...x, giftsSection: { ...x.giftsSection, enabled: v } };
      case 'texto': return { ...x, note: { ...x.note, enabled: v } };
      case 'rsvp': return { ...x, rsvp: { ...x.rsvp, enabled: v } };
      case 'dress': return { ...x, dressCode: { ...x.dressCode, enabled: v } };
      case 'fotos': return { ...x, gallery: { ...x.gallery, enabled: v } };
      case 'mensaje': return { ...x, message: { ...x.message, enabled: v } };
      case 'musica': return { ...x, playlist: { ...x.playlist, enabled: v } };
      case 'fecha': return { ...x, saveDate: v };
      case 'eventos': return !v ? { ...x, events: x.events.map(e => ({ ...e, enabled: false })) } : !x.events.some(e => e.enabled) ? { ...x, events: x.events.map((e, i) => (i === 0 ? { ...e, enabled: true } : e)) } : x;
      default: return x;
    }
  });
}
/** Solo la portada es obligatoria: todo lo demás se puede quitar (y volver a agregar con lo que se había cargado). */
const REMOVABLE: SectionId[] = ['fecha', 'eventos', 'regalos', 'rsvp', 'dress', 'texto', 'fotos', 'musica', 'mensaje'];

type Row = { id: SectionId; sec?: Sec; label: string; status: string; tone: Tone; movable: boolean; removable: boolean; fixed?: string };

function SiteEditor() {
  const s = useAppState();
  const toast = useToast();
  // `null` = la estructura de la invitación; una sección = su edición.
  const [sel, setSel] = useState<SectionId | null>(null);
  const [announce, setAnnounce] = useState('');
  const [track, setTrack] = useState({ title: '', artist: '' });
  const [trackError, setTrackError] = useState('');
  const photoRef = useRef<HTMLInputElement>(null);
  const kb = useKeyboardState();
  const topRef = useRef<HTMLDivElement>(null);

  const site = s.site;
  const sections = sectionsOf(s);
  const byId = (id: SectionId) => sections.find(x => x.id === id)!;
  const shown = (b: BlockId) => isOn(s, BLOCK_SECTION[b]);

  /* Estructura: lo que hoy ve un invitado, de arriba hacia abajo. */
  const rows: Row[] = [{ id: 'portada', sec: byId('portada'), label: 'Portada', status: byId('portada').status, tone: byId('portada').tone, movable: false, removable: false, fixed: 'Siempre primera' }];
  for (const b of site.order) {
    const id = BLOCK_SECTION[b], sec = byId(id);
    if (isOn(s, id)) rows.push({ id, sec, label: sec.label, status: sec.status, tone: sec.tone, movable: true, removable: REMOVABLE.includes(id) });
  }
  const movableIds = rows.filter(r => r.movable).map(r => r.id);
  const addable = sections.filter(x => x.id !== 'portada' && !isOn(s, x.id));
  const visibleCount = rows.length;
  const readyCount = rows.filter(r => r.tone === 'ok').length;
  const sec = sel ? byId(sel) : null;
  const hiddenNow = sel ? !isOn(s, sel) : false;

  const open = (id: SectionId) => {
    setSel(id);
    window.setTimeout(() => topRef.current?.scrollIntoView({ block: 'nearest' }), 0);
  };
  const back = () => { setSel(null); window.setTimeout(() => topRef.current?.scrollIntoView({ block: 'nearest' }), 0); };
  const remove = (id: SectionId, label: string) => {
    setOn(id, false);
    if (sel === id) back();
    toast(`Quitamos «${label}» de tu sitio. Lo que cargaste se guardó.`, 'ok', { label: 'Deshacer', onClick: () => setOn(id, true) });
  };
  const add = (id: SectionId) => { setOn(id, true); open(id); };
  const move = (id: SectionId, dir: -1 | 1, label: string) => {
    const b = (Object.keys(BLOCK_SECTION) as BlockId[]).find(k => BLOCK_SECTION[k] === id)!;
    const next = moveBlock(site.order, b, dir, shown);
    if (next === site.order) return;
    patchSite(x => ({ ...x, order: next }));
    const pos = next.filter(shown).indexOf(b) + 2; // la portada es la 1
    setAnnounce(`${label} ahora es la sección ${pos} de ${visibleCount}.`);
    // Al reordenar, la fila cambia de lugar: el foco vuelve al mismo botón para poder seguir moviéndola con el teclado.
    window.requestAnimationFrame(() => {
      const same = document.querySelector<HTMLButtonElement>(`[data-section="${id}"] [data-move="${dir}"]`);
      (same && !same.disabled ? same : document.querySelector<HTMLElement>(`[data-section="${id}"] [data-move="${-dir}"]`))?.focus();
    });
  };
  const anchor = sel ? ANCHOR[sel] : undefined;
  const path = sitePath(s);

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_PHOTOS - site.gallery.photos.length;
    const list = Array.from(files).slice(0, room);
    if (files.length > room) toast(`Entran hasta ${MAX_PHOTOS} fotos. Sumamos ${room}.`);
    for (const f of list) {
      try { const img = await readImage(f, 1100); patchSite(x => ({ ...x, gallery: { ...x.gallery, photos: [...x.gallery.photos, { id: uid('foto'), src: img.src, alt: '' }] } })); }
      catch (e) { toast(e instanceof Error ? e.message : 'No pudimos cargar la foto.', 'error'); }
    }
    if (photoRef.current) photoRef.current.value = '';
  };
  const movePhoto = (i: number, d: -1 | 1) => patchSite(x => { const p = [...x.gallery.photos]; const j = i + d; if (j < 0 || j >= p.length) return x; [p[i], p[j]] = [p[j]!, p[i]!]; return { ...x, gallery: { ...x.gallery, photos: p } }; });
  const addTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (track.title.trim().length < 2) { setTrackError('Escribí el nombre de la canción.'); return; }
    setTrackError('');
    patchSite(x => ({ ...x, playlist: { ...x.playlist, tracks: [...x.playlist.tracks, { title: track.title.trim(), artist: track.artist.trim() || 'Artista a confirmar' }] } }));
    setTrack({ title: '', artist: '' });
  };
  const flag = (k: 'rsvp' | 'dressCode' | 'gallery' | 'message' | 'playlist') => (v: boolean) => patchSite(x => ({ ...x, [k]: { ...x[k], enabled: v } }));


  return (
    <div className="pn-page pn-editor ed-page" data-kb={kb} data-sel={sel ?? undefined}>
      {/* Rediseño «Tu sitio» (2026-11-25, boceto): título, avance y un único acceso claro a «Ver mi sitio», como el Inicio. */}
      <header className="pn-page-head is-compact ed-head">
        <div>
          <h1>Tu sitio</h1>
          <p className="pn-sub">Armalo sección por sección. Todo se guarda solo.</p>
        </div>
        <button type="button" className="pn-btn ed-see" onClick={() => openPreview('home', anchor)}><Eye size={17} aria-hidden="true" />Ver mi sitio</button>
      </header>
      <p className="pn-sr" role="status" aria-live="polite">{announce}</p>

      <div className="ed-grid">
        <div className="ed-side" ref={topRef}>
          {!sec ? (
            <>
              <section className="ed-card ed-steps" aria-labelledby="ed-structure">
                <div className="ed-card-head">
                  <h2 id="ed-structure">Tus secciones</h2>
                </div>
                <ol className="ed-list">
                  {rows.map((r, i) => {
                    const Icon = ICON[r.id];
                    const Status = STATUS_ICON[r.tone];
                    return (
                      <li key={r.id} className={`ed-item is-${r.tone}`} data-section={r.id}>
                        <span className="ed-pos" aria-hidden="true">{i + 1}</span>
                        <button type="button" className="ed-item-main" onClick={() => open(r.id)} aria-label={`Editar ${r.label}. ${r.status}`}>
                          <span className="ed-tile-ico" aria-hidden="true"><Icon size={21} strokeWidth={1.5} /></span>
                          <span className="ed-item-text">
                            <strong>{r.label}</strong>
                            <span className={`ed-chip is-${r.tone}`}><Status size={12} strokeWidth={2.4} aria-hidden="true" />{r.status}</span>
                          </span>
                          <ChevronRight size={18} className="ed-item-go" aria-hidden="true" />
                        </button>
                        <div className="ed-item-acts">
                          {r.movable
                            ? <>
                                <button type="button" className="ed-mini" data-move="-1" disabled={movableIds[0] === r.id} onClick={() => move(r.id, -1, r.label)} aria-label={`Subir ${r.label}`}><ArrowUp size={15} aria-hidden="true" /></button>
                                <button type="button" className="ed-mini" data-move="1" disabled={movableIds[movableIds.length - 1] === r.id} onClick={() => move(r.id, 1, r.label)} aria-label={`Bajar ${r.label}`}><ArrowDown size={15} aria-hidden="true" /></button>
                              </>
                            : <span className="ed-fixed">{r.fixed}</span>}
                          {r.removable && <button type="button" className="ed-mini" onClick={() => remove(r.id, r.label)} aria-label={`Quitar ${r.label} de tu sitio`}><X size={15} aria-hidden="true" /></button>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>

              <section className="ed-card ed-more" aria-labelledby="ed-add">
                <div className="ed-card-head">
                  <h2 id="ed-add">Sumá más secciones</h2>
                </div>
                {addable.length === 0
                  ? <p className="ed-help">Ya tenés todas las secciones en tu sitio.</p>
                  : <ul className="ed-tiles">
                      {addable.map(x => {
                        const Icon = ICON[x.id];
                        return (
                          <li key={x.id}>
                            <button type="button" className="ed-tile" onClick={() => add(x.id)} aria-label={`Agregar ${x.label} a tu sitio`}>
                              <span className="ed-tile-ico" aria-hidden="true"><Icon size={21} strokeWidth={1.5} /></span>
                              <span className="ed-tile-text"><strong>{x.label}</strong><small>{PURPOSE[x.id]}</small></span>
                              <span className="ed-tile-plus" aria-hidden="true"><Plus size={16} strokeWidth={2.2} /></span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>}
              </section>
            </>
          ) : (
            <>
              {/* Barra fija mientras se edita: dónde estoy (la sección), cómo vuelvo (flecha) y «Listo», siempre a la vista aunque el formulario sea largo.
                  En el celular la ventana en vivo va pegada debajo, en el mismo bloque fijo, para que nada del formulario asome por encima. */}
              <div className="ed-stick">
                <div className="ed-bar">
                  <button type="button" className="ed-back" onClick={back} aria-label="Volver a Tu sitio"><ArrowLeft size={18} aria-hidden="true" /><span className="ed-back-txt">Tu sitio</span></button>
                  <p className="ed-place"><strong className="pn-sr">{sec.label}</strong></p>
                  <button type="button" className="pn-btn is-small ed-done" onClick={back}>Listo</button>
                </div>
              </div>
              <div className="ed-form">

      {sel === 'portada' && (
        <Panel sec={sec}>
          <CoverFields />
        </Panel>
      )}
      {sel === 'fecha' && (
        <Panel sec={sec}>
          {/* Save the date (2026-11-25): la fecha se puede cargar acá también (es el mismo dato que la portada) y la cuenta regresiva es un interruptor claro. */}
          <Field label="Fecha del casamiento">{a => <input type="date" id={a.id} value={s.date ?? ''} onChange={e => update(x => ({ ...x, date: e.target.value || null }))} />}</Field>
          <label className="ed-option">
            <span className="ed-option-text"><strong>Cuenta regresiva</strong></span>
            <span className="ed-switch"><input type="checkbox" role="switch" checked={site.countdown} onChange={e => patchSite(x => ({ ...x, countdown: e.target.checked }))} aria-label="Mostrar la cuenta regresiva" /><span className="ed-switch-ui" aria-hidden="true" /></span>
          </label>
        </Panel>
      )}
      {sel === 'eventos' && (
        <Panel sec={sec}>
          <ul className="pn-evlist">{site.events.map(ev => <EventRow key={ev.key} ev={ev} />)}</ul>
        </Panel>
      )}
      {sel === 'rsvp' && (
        <Panel sec={sec}>
          <p className="pn-muted">Las respuestas te llegan a Invitados.</p>
          <Link to="/panel/invitados" className="pn-link">Ver las respuestas en Invitados</Link>
        </Panel>
      )}
      {sel === 'dress' && (
        <Panel sec={sec}>
        <Field label="Título">{a => <input id={a.id} type="text" value={site.dressCode.title} placeholder="Elegante sport" onChange={e => patchSite(x => ({ ...x, dressCode: { ...x.dressCode, title: e.target.value } }))} />}</Field>
        <Field label="Texto" optional>{a => <textarea id={a.id} rows={3} value={site.dressCode.text} onChange={e => patchSite(x => ({ ...x, dressCode: { ...x.dressCode, text: e.target.value } }))} />}</Field>
        <label className="pn-check"><input type="checkbox" checked={site.dressCode.showColors} onChange={e => patchSite(x => ({ ...x, dressCode: { ...x.dressCode, showColors: e.target.checked } }))} /><span>Mostrar círculos de colores sugeridos</span></label>
        {site.dressCode.showColors && (
          <div className="ed-colors-box">
            <ul className="ed-colors">
              {site.dressCode.colors.map((c, i) => (
                <li key={i}>
                  <input type="color" value={isHexColor(c.color) ? c.color : '#d9cdb8'} aria-label={`Color del círculo ${i + 1}`} onChange={e => patchSite(x => ({ ...x, dressCode: { ...x.dressCode, colors: x.dressCode.colors.map((k, j) => (j === i ? { ...k, color: e.target.value } : k)) } }))} />
                  <input type="text" value={c.name} maxLength={24} placeholder="Nombre (opcional)" aria-label={`Nombre del círculo ${i + 1}`} onChange={e => patchSite(x => ({ ...x, dressCode: { ...x.dressCode, colors: x.dressCode.colors.map((k, j) => (j === i ? { ...k, name: e.target.value } : k)) } }))} />
                </li>
              ))}
            </ul>
            <button type="button" className="pn-link" onClick={() => patchSite(x => ({ ...x, dressCode: { ...x.dressCode, colors: defaultColors() } }))}>Volver a los colores sugeridos</button>
          </div>
        )}
        </Panel>
      )}
      {sel === 'regalos' && (
        <Panel sec={sec}>
        <div className="ed-ev-row">
          <Field label="Título">{a => <input id={a.id} type="text" value={site.giftsSection.title} placeholder={DEFAULT_GIFTS_TITLE} onChange={e => patchSite(x => ({ ...x, giftsSection: { ...x.giftsSection, title: e.target.value } }))} />}</Field>
          <Field label="Texto del botón">{a => <input id={a.id} type="text" value={site.giftsSection.button} placeholder={DEFAULT_GIFTS_BUTTON} maxLength={40} onChange={e => patchSite(x => ({ ...x, giftsSection: { ...x.giftsSection, button: e.target.value } }))} />}</Field>
        </div>
        <Field label="Texto" optional>{a => <input id={a.id} type="text" value={site.giftsSection.text} placeholder={DEFAULT_GIFTS_TEXT} onChange={e => patchSite(x => ({ ...x, giftsSection: { ...x.giftsSection, text: e.target.value } }))} />}</Field>
        <Link to="/panel/regalos" className="ed-golink"><GiftIcon size={16} strokeWidth={1.6} aria-hidden="true" />{s.gifts.items.length === 0 ? 'Elegir regalos' : `Mi lista · ${s.gifts.items.length} ${s.gifts.items.length === 1 ? 'regalo' : 'regalos'}`}<ChevronRight size={16} aria-hidden="true" /></Link>
        </Panel>
      )}
      {sel === 'texto' && (
        <Panel sec={sec}>
        <Field label="Título" optional>{a => <input id={a.id} type="text" value={site.note.title} maxLength={80} placeholder="Un aviso importante" onChange={e => patchSite(x => ({ ...x, note: { ...x.note, title: e.target.value } }))} />}</Field>
        <Field label="Mensaje" optional>{a => <textarea id={a.id} rows={5} value={site.note.text} maxLength={1200} onChange={e => patchSite(x => ({ ...x, note: { ...x.note, text: e.target.value } }))} />}</Field>
        </Panel>
      )}
      {sel === 'fotos' && (
        <Panel sec={sec} planTag={tagFor('gallery')}>
        {site.gallery.photos.length > 0 && (
          <ul className="pn-photos">
            {site.gallery.photos.map((p, i) => (
              <li key={p.id}>
                <img src={p.src} alt="" />
                <div className="pn-gactions">
                  <button type="button" className="pn-icon" onClick={() => movePhoto(i, -1)} disabled={i === 0} aria-label={`Mover la foto ${i + 1} antes`}><ArrowUp size={15} aria-hidden="true" /></button>
                  <button type="button" className="pn-icon" onClick={() => movePhoto(i, 1)} disabled={i === site.gallery.photos.length - 1} aria-label={`Mover la foto ${i + 1} después`}><ArrowDown size={15} aria-hidden="true" /></button>
                  <button type="button" className="pn-icon" onClick={() => patchSite(x => ({ ...x, gallery: { ...x.gallery, photos: x.gallery.photos.filter(q => q.id !== p.id) } }))} aria-label={`Quitar la foto ${i + 1}`}><X size={15} aria-hidden="true" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <input ref={photoRef} className="pn-sr" type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="Elegir fotos" onChange={e => void addPhotos(e.target.files)} />
        <div className="pn-actions is-tight"><button type="button" className="pn-btn is-ghost is-small" disabled={site.gallery.photos.length >= MAX_PHOTOS} onClick={() => photoRef.current?.click()}><Plus size={15} aria-hidden="true" />Agregar fotos</button><span className="pn-hint">{site.gallery.photos.length >= MAX_PHOTOS ? `Llegaste al máximo de ${MAX_PHOTOS} fotos. Quitá alguna para sumar otra.` : `${site.gallery.photos.length} de ${MAX_PHOTOS}.`}</span></div>
        <Field label="Hashtag" optional>{a => <input id={a.id} type="text" value={site.gallery.hashtag} placeholder="#TomasYMartina2027" onChange={e => patchSite(x => ({ ...x, gallery: { ...x.gallery, hashtag: e.target.value } }))} />}</Field>
        <Field label="Usuario de Instagram" optional>{a => <input id={a.id} type="text" value={site.gallery.handle} placeholder="@tomasymartina" onChange={e => patchSite(x => ({ ...x, gallery: { ...x.gallery, handle: e.target.value } }))} />}</Field>
        </Panel>
      )}
      {sel === 'mensaje' && (
        <Panel sec={sec} planTag={tagFor('message')}>
        <Field label="Frase">{a => <input id={a.id} type="text" value={site.message.title} onChange={e => patchSite(x => ({ ...x, message: { ...x.message, title: e.target.value } }))} />}</Field>
        <Field label="Mensaje" optional>{a => <textarea id={a.id} rows={3} value={site.message.text} onChange={e => patchSite(x => ({ ...x, message: { ...x.message, text: e.target.value } }))} aria-describedby={a.describedBy} />}</Field>
        </Panel>
      )}
      {sel === 'musica' && (
        <Panel sec={sec} planTag={tagFor('playlist')}>
          <Field label="Link de tu playlist de Spotify" error={site.playlist.spotify.trim() && !spotifyEmbed(site.playlist.spotify) ? 'Pegá el link de una playlist de Spotify (open.spotify.com/playlist/…).' : undefined}>
            {a => <input id={a.id} type="url" inputMode="url" value={site.playlist.spotify} placeholder="https://open.spotify.com/playlist/…" onChange={e => patchSite(x => ({ ...x, playlist: { ...x.playlist, spotify: e.target.value } }))} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
          </Field>
          {!spotifyEmbed(site.playlist.spotify) && <p className="pn-hint">En Spotify: Compartir → Copiar enlace.</p>}
        </Panel>
      )}

                {REMOVABLE.includes(sel!) && !hiddenNow && (
                  <div className="pn-actions ed-remove-row"><button type="button" className="pn-btn is-ghost is-small" onClick={() => remove(sel!, sec.label)}>Quitar de tu sitio</button></div>
                )}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
