// GIFT-15 / ONB-06 · WhatsApp (specs/GIFT-15-whatsapp-y-agradecer/spec.md): formato (D6), enlace y mensaje de agradecimiento (D5), y que nunca se publica (D8).
import { describe, expect, it } from 'vitest';
import { emptyState } from '@/lib/weda/logic';
import { formatPhone, maskPhone, normalizePhone, splitPhone, thankMessage, validatePhone, waLink } from '@/lib/weda/phone';
import { siteFromState } from '@/lib/weda/site-model';
import { sanitize } from '@/lib/weda/store';

describe('GIFT-15 · WhatsApp', () => {
  it('D6: Argentina en formato internacional, con el 9 de celular, sin el 0 ni el 15', () => {
    for (const raw of ['11 5555 4444', '011 15 5555-4444', '+54 9 11 5555 4444', '9 11 5555 4444', '1155554444', '54 11 5555 4444']) {
      expect(normalizePhone('54', raw)).toBe('5491155554444');
    }
    expect(normalizePhone('54', '351 15 444 5566')).toBe('5493514445566');
    expect(normalizePhone('54', '5555')).toBeNull();
    expect(normalizePhone('598', '099 123 456')).toBe('59899123456');
    expect(normalizePhone('54', '+1 415 555 0100')).toBe('14155550100');
    expect(validatePhone('54', '')).toMatch(/Escribí tu WhatsApp/);
    expect(validatePhone('54', '123')).toMatch(/Revisá el número/);
  });

  it('se muestra legible, se enmascara para la administración y se vuelve a separar para editar', () => {
    expect(formatPhone('5491155554444')).toBe('+54 9 11 5555-4444');
    expect(maskPhone('5491155554444')).toBe('+549 •••• 4444');
    expect(splitPhone('5491155554444')).toEqual({ country: '54', number: '1155554444' });
    expect(splitPhone('59899123456')).toEqual({ country: '598', number: '99123456' });
  });

  it('D5: el enlace abre ese chat con el mensaje de agradecimiento ya escrito', () => {
    const text = thankMessage('Nora Díaz', ['Excursión en barco', 'Cena frente al mar'], 'Ana y Leo');
    expect(text).toBe('¡Hola, Nora! Muchas gracias por regalarnos Excursión en barco y Cena frente al mar. Nos hizo muy felices. Ana y Leo');
    const url = new URL(waLink('5491155554444', text));
    expect(url.origin + url.pathname).toBe('https://wa.me/5491155554444');
    expect(url.searchParams.get('text')).toBe(text);
    // Regalo grupal: se agradece también al grupo.
    expect(thankMessage('Nora', ['Cena'], 'Ana y Leo', 'Los primos Díaz')).toBe('¡Hola, Nora! Muchas gracias a vos y a Los primos Díaz por regalarnos Cena. Nos hizo muy felices. Ana y Leo');
  });

  it('D8: el WhatsApp de la pareja se guarda en el borrador y nunca llega a la página', () => {
    const s = sanitize({ ...emptyState(), onboarded: true, couple: { first: 'Ana', second: 'Leo', whatsapp: '5491155554444' } });
    expect(s.couple.whatsapp).toBe('5491155554444');
    expect(sanitize({ ...emptyState(), couple: { first: 'A', second: 'B', whatsapp: 'no' } }).couple.whatsapp).toBeUndefined();
    expect(JSON.stringify(siteFromState(s))).not.toContain('5491155554444');
  });
});
