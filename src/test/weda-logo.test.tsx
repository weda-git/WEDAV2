// Logo oficial (v2.0): misma geometría del archivo, color por `currentColor` y decorativo dentro de un enlace con nombre propio.
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { WedaLogo } from '@/components/weda-logo';

const official = readFileSync('public/weda-logo.svg', 'utf8');
const shapes = (svg: string) => [...svg.matchAll(/\sd="([^"]+)"/g)].map(m => m[1]);

describe('logo de Weda', () => {
  it('usa los mismos trazos que el archivo oficial', () => {
    const { container } = render(<WedaLogo />);
    expect(shapes(container.innerHTML)).toEqual(shapes(official));
    expect(container.querySelectorAll('circle')).toHaveLength(2);
    expect(container.querySelectorAll('circle')[0]!.getAttribute('r')).toBe('236.7');
  });

  it('toma el color del contenedor y es decorativo (el enlace que lo rodea dice «Weda»)', () => {
    const svg = render(<WedaLogo />).container.querySelector('svg')!;
    expect(svg.getAttribute('fill')).toBe('currentColor');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });
});
