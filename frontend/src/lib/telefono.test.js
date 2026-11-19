import { describe, expect, it } from 'vitest';
import { numeroWhatsapp } from './telefono';

describe('numeroWhatsapp (celular argentino para wa.me)', () => {
  it.each([
    ['02604119865', 'con 0 de larga distancia (el caso del panel)'],
    ['2604119865', 'código de área y número'],
    ['260 411-9865', 'con espacios y guiones'],
    ['(0260) 15-4119865', 'con 0, paréntesis y 15'],
    ['260154119865', 'con 15 sin separadores'],
    ['+54 9 260 411 9865', 'internacional completo'],
    ['+54 260 411 9865', 'internacional sin el 9'],
    ['5492604119865', 'internacional sin +'],
    ['0054 9 260 4119865', 'con 00 internacional'],
  ])('%s (%s) -> 5492604119865', (entrada) => {
    expect(numeroWhatsapp(entrada)).toBe('5492604119865');
  });

  it('otros códigos de área (2 y 4 dígitos)', () => {
    expect(numeroWhatsapp('011 15 5555-1234')).toBe('5491155551234');
    expect(numeroWhatsapp('02627 15 412345')).toBe('5492627412345');
  });

  it('devuelve null si no parece un número argentino válido', () => {
    expect(numeroWhatsapp('')).toBeNull();
    expect(numeroWhatsapp(null)).toBeNull();
    expect(numeroWhatsapp('4119865')).toBeNull();
    expect(numeroWhatsapp('abc')).toBeNull();
  });
});
