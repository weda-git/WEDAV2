import { track } from '@/lib/analytics';
import { useEffect, useRef, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Field } from '@/components/panel/ui';
import { PhoneField } from '@/components/panel/phone-field';
import { normalizePhone, splitPhone, validatePhone } from '@/lib/weda/phone';
import { OnboardingPhoto, OnboardingShell } from '@/components/panel/onboarding';
import { validateOnboarding } from '@/lib/weda/logic';
import { update, useAppState, useHydrated } from '@/lib/weda/store';

export const Route = createFileRoute('/crear/')({
  component: Names,
});

/* Pantalla 1 de 3: quiénes se casan. Nombre y apellido de cada uno, con el «&» en el medio. Los apellidos son opcionales (no se muestra el aviso, pero no se exigen).
   Después vienen la fecha y el lugar (/crear/fecha) y la foto (/crear/foto); al terminar se entra al panel. */
function Names() {
  const navigate = useNavigate();
  const state = useAppState();
  const hydrated = useHydrated();
  const filled = useRef(false);
  const [first, setFirst] = useState('');
  const [firstLast, setFirstLast] = useState('');
  const [second, setSecond] = useState('');
  const [secondLast, setSecondLast] = useState('');
  const [phone, setPhone] = useState({ country: '54', number: '' });
  const [errors, setErrors] = useState<ReturnType<typeof validateOnboarding> & { phone?: string | undefined }>({});

  // Si ya había datos guardados (por ejemplo, la pareja volvió desde la pantalla siguiente), se recuperan: no se pierde nada.
  useEffect(() => {
    if (!hydrated || filled.current) return;
    filled.current = true;
    setFirst(state.couple.first); setSecond(state.couple.second);
    setFirstLast(state.couple.firstLast ?? ''); setSecondLast(state.couple.secondLast ?? '');
    if (state.couple.whatsapp) setPhone(splitPhone(state.couple.whatsapp));
  }, [hydrated, state]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // ONB-06 (D1): el WhatsApp de la pareja es obligatorio.
    const found = { ...validateOnboarding({ first, second, date: '', noDate: true }), phone: validatePhone(phone.country, phone.number) ?? undefined };
    setErrors(found);
    if (found.first || found.second || found.phone) { document.getElementById(found.first ? 'on-first' : found.second ? 'on-second' : 'on-phone')?.focus(); return; }
    const couple = { first: first.trim(), second: second.trim(), ...(firstLast.trim() ? { firstLast: firstLast.trim() } : {}), ...(secondLast.trim() ? { secondLast: secondLast.trim() } : {}), whatsapp: normalizePhone(phone.country, phone.number)! };
    update(s => ({ ...s, onboarded: true, couple }));
    track('event_created');
    void navigate({ to: '/crear/fecha' });
  };
  const text = (set: (v: string) => void, key?: 'first' | 'second') => (e: React.ChangeEvent<HTMLInputElement>) => { set(e.target.value); if (key) setErrors(x => ({ ...x, [key]: undefined })); };

  return (
    <OnboardingShell step={1} back="/crear/cuenta" formId="ob-names" title="Conozcámonos. ¿Cómo se llaman?" sub="Con estos datos armamos tu panel y tu sitio. Lo demás lo completás después." side={<OnboardingPhoto src="/onboarding-nombres.webp" trimLeft />}>
      <form id="ob-names" onSubmit={submit} noValidate className="pn-form">
        <div className="pn-two">
          <Field id="on-first" label="Tu nombre" error={errors.first}>
            {a => <input id="on-first" type="text" autoComplete="given-name" value={first} onChange={text(setFirst, 'first')} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
          </Field>
          <Field id="on-first-last" label="Tu apellido">
            {a => <input id="on-first-last" type="text" autoComplete="family-name" value={firstLast} onChange={text(setFirstLast)} aria-describedby={a.describedBy} />}
          </Field>
        </div>
        <p className="ob-amp" aria-hidden="true">&amp;</p>
        <div className="pn-two">
          <Field id="on-second" label="Nombre de tu pareja" error={errors.second}>
            {a => <input id="on-second" type="text" autoComplete="off" value={second} onChange={text(setSecond, 'second')} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
          </Field>
          <Field id="on-second-last" label="Apellido de tu pareja">
            {a => <input id="on-second-last" type="text" autoComplete="off" value={secondLast} onChange={text(setSecondLast)} aria-describedby={a.describedBy} />}
          </Field>
        </div>
        <PhoneField id="on-phone" label="Tu WhatsApp" hint="Para escribirte si necesitás ayuda con tu cuenta. No lo publicamos." country={phone.country} number={phone.number} error={errors.phone}
          onChange={v => { setPhone(v); setErrors(x => ({ ...x, phone: undefined })); }} />
      </form>
    </OnboardingShell>
  );
}
