// Campo de WhatsApp del panel y del alta (GIFT-15 / ONB-06): país (por defecto +54) y número. Guarda el número completo, solo dígitos.
import { useState } from 'react';
import { Field } from './ui';
import { COUNTRIES, formatPhone, normalizePhone } from '@/lib/weda/phone';

export function PhoneField({ id, label = 'WhatsApp', hint, country, number, error, onChange }: {
  id: string; label?: string; hint?: string | undefined; country: string; number: string; error?: string | undefined;
  onChange: (v: { country: string; number: string }) => void;
}) {
  const [touched, setTouched] = useState(false);
  const full = normalizePhone(country, number);
  return (
    <Field id={id} label={label} error={error} hint={!error && touched && full ? `Va a quedar así: ${formatPhone(full)}` : hint}>
      {a => (
        <div className="pn-phone">
          <select aria-label="Código de país" value={country} onChange={e => onChange({ country: e.target.value, number })}>
            {COUNTRIES.map(c => <option key={c.code} value={c.code} aria-label={c.label}>+{c.code}</option>)}
          </select>
          <input id={id} type="tel" inputMode="tel" autoComplete="tel-national" placeholder={country === '54' ? '11 5555 4444' : 'Número'} value={number}
            onChange={e => onChange({ country, number: e.target.value })} onBlur={() => setTouched(true)} aria-invalid={a.invalid} aria-describedby={a.describedBy} />
        </div>
      )}
    </Field>
  );
}
