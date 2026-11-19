import { describe, expect, it } from 'vitest';
import { pestanaInicial } from './panel';

describe('pestanaInicial', () => {
  it('respeta una pestaña guardada que existe', () => {
    expect(pestanaInicial('offers')).toBe('offers');
    expect(pestanaInicial('prices')).toBe('prices');
  });

  it('una pestaña que ya no existe (Preferencias) abre Contabilidad', () => {
    expect(pestanaInicial('preferences')).toBe('accounting');
  });

  it('sin nada guardado abre Contabilidad', () => {
    expect(pestanaInicial(null)).toBe('accounting');
    expect(pestanaInicial('')).toBe('accounting');
  });
});
