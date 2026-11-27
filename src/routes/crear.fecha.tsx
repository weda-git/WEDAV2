import { useEffect, useRef, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Field } from '@/components/panel/ui';
import { OnboardingPhoto, OnboardingShell } from '@/components/panel/onboarding';
import { todayIso, validateOnboarding } from '@/lib/weda/logic';
import { update, useAppState, useHydrated } from '@/lib/weda/store';

export const Route = createFileRoute('/crear/fecha')({
  component: DateAndPlace,
});

/* Pantalla 2 de 3: fecha y lugar. La fecha es obligatoria (ONB-06, D2), salvo que se tilde «Todavía no la sabemos»; el lugar puede quedar para después.
   La fecha se valida (que exista y no haya pasado). El lugar se guarda como el nombre de la ceremonia (primer momento de la página) y se puede completar desde el panel. */
function DateAndPlace() {
  const navigate = useNavigate();
  const state = useAppState();
  const hydrated = useHydrated();
  const filled = useRef(false);
  const [date, setDate] = useState('');
  const [place, setPlace] = useState('');
  const [unknown, setUnknown] = useState(false);
  const [errors, setErrors] = useState<{ date?: string | undefined }>({});

  // Sin nombres no hay evento: se vuelve a la primera pantalla.
  useEffect(() => {
    if (hydrated && !state.onboarded) void navigate({ to: '/crear', replace: true });
  }, [hydrated, state.onboarded, navigate]);

  useEffect(() => {
    if (!hydrated || filled.current) return;
    filled.current = true;
    setDate(state.date ?? '');
    setPlace(state.site.events[0]?.name ?? '');
  }, [hydrated, state]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const noDate = unknown;
    const dateError = validateOnboarding({ first: state.couple.first, second: state.couple.second, date, noDate }).date?.replace('Todavía no tenemos fecha', 'Todavía no la sabemos');
    setErrors({ date: dateError });
    if (dateError) { document.getElementById('on-date')?.focus(); return; }
    update(s => ({
      ...s,
      date: noDate ? null : date,
      site: { ...s.site, events: s.site.events.map((ev, i) => (i === 0 && place.trim() ? { ...ev, name: place.trim(), title: ev.title.trim() || 'Ceremonia' } : ev)) },
    }));
    void navigate({ to: '/crear/foto' });
  };

  return (
    <OnboardingShell step={2} back="/crear" formId="ob-date" title="¿Cuándo y dónde?" sub="Si todavía no saben la fecha, tildá «Todavía no la sabemos» y la completan después." side={<OnboardingPhoto src="/onboarding-fecha.webp" />}>
      <form id="ob-date" onSubmit={submit} noValidate className="pn-form">
        <Field id="on-date" label="Fecha del casamiento" error={errors.date}>
          {a => <input id="on-date" type="date" min={todayIso()} value={date} disabled={unknown} onChange={e => { setDate(e.target.value); setErrors(x => ({ ...x, date: undefined })); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
        </Field>
        <label className="pn-check ob-nodate"><input type="checkbox" checked={unknown} onChange={e => { setUnknown(e.target.checked); if (e.target.checked) setDate(''); setErrors({}); }} /><span>Todavía no la sabemos</span></label>
        <Field id="on-place" label="Lugar del casamiento" optional>
          {a => <input id="on-place" type="text" autoComplete="off" placeholder="Salón, jardín o ciudad" value={place} onChange={e => setPlace(e.target.value)} aria-describedby={a.describedBy} />}
        </Field>
      </form>
    </OnboardingShell>
  );
}
