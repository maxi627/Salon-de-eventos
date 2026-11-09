import { describe, expect, it } from 'vitest';
import { volverSeguro } from './volver';

describe('volverSeguro', () => {
  it('acepta rutas del propio sitio', () => {
    expect(volverSeguro('/reservar/2026-11-14')).toBe('/reservar/2026-11-14');
    expect(volverSeguro('/mis-reservas')).toBe('/mis-reservas');
  });
  it('rechaza enlaces a otros sitios y valores vacíos', () => {
    for (const malo of ['https://x.com', '//x.com', '/\\x.com', 'javascript:alert(1)', '', null, undefined]) {
      expect(volverSeguro(malo)).toBeNull();
    }
  });
  it('rechaza caracteres de control y espacios, que el navegador descarta al armar la URL', () => {
    // "/\t/x.com" el navegador lo resuelve como "//x.com" → https://x.com/
    for (const malo of ['/\t/x.com', '/\n/x.com', '/\r/x.com', '/ /x.com', '/\u0000x']) {
      expect(volverSeguro(malo)).toBeNull();
    }
  });
});
