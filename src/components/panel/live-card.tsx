import { useEffect, useState } from 'react';

/* Estado del teclado virtual en el editor «Tu página»: con poco alto visible, el bloque fijo de arriba se achica.
   (Hasta el 2026-11-25 este archivo tenía además la ventana en vivo de la página; el rediseño la sacó del editor.) */

/** Estado del teclado virtual: con poco alto visible, el bloque fijo se achica o pasa a una tira. */
export type KeyboardState = 'off' | 'compact' | 'tight';

export function useKeyboardState(): KeyboardState {
  const [state, setState] = useState<KeyboardState>('off');
  useEffect(() => {
    const vv = window.visualViewport;
    let base = Math.max(window.innerHeight, vv?.height ?? 0);
    const typing = () => {
      const a = document.activeElement as HTMLInputElement | null;
      return !!a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !['checkbox', 'radio', 'file', 'button', 'submit'].includes(a.type);
    };
    const check = () => {
      const h = vv?.height ?? window.innerHeight;
      base = Math.max(base, h);
      if (!typing() || h > base - 140) return setState('off');
      setState(h < 480 ? 'tight' : 'compact');
    };
    const onOrientation = () => { base = vv?.height ?? window.innerHeight; check(); };
    const onBlur = () => window.setTimeout(check, 120);
    vv?.addEventListener('resize', check);
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', onOrientation);
    document.addEventListener('focusin', check);
    document.addEventListener('focusout', onBlur);
    check();
    return () => {
      vv?.removeEventListener('resize', check);
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', onOrientation);
      document.removeEventListener('focusin', check);
      document.removeEventListener('focusout', onBlur);
    };
  }, []);
  return state;
}
