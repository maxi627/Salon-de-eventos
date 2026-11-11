import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// toISOString() da la fecha en UTC: en Argentina (UTC-3), después de las 21 h ya es el día
// siguiente. Para "la fecha de hoy" o un 'YYYY-MM-DD' hay que usar hoyLocal() / aTextoFecha().
const PATRON = /toISOString\(\)\s*\.\s*(split\(\s*['"]T['"]\s*\)|slice\(\s*0\s*,\s*10\s*\)|substring\(\s*0\s*,\s*10\s*\))/;

function archivos(dir) {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = path.join(dir, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return /\.(jsx?|tsx?)$/.test(nombre) && !nombre.includes('.test.') ? [ruta] : [];
  });
}

describe('fechas en hora local', () => {
  it('ningún archivo arma una fecha YYYY-MM-DD con toISOString', () => {
    const src = path.resolve(__dirname, '..');
    const encontrados = archivos(src).flatMap((ruta) =>
      readFileSync(ruta, 'utf-8')
        .split('\n')
        .map((linea, i) => (PATRON.test(linea) ? `${path.relative(src, ruta)}:${i + 1}` : null))
        .filter(Boolean),
    );
    expect(encontrados).toEqual([]);
  });
});
