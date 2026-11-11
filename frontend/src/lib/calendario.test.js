import { describe, expect, it } from 'vitest';
import { etiquetaDelDia, feriadosPorDia } from './calendario';

const NAVIDAD = { fecha: '2026-12-25', nombre: 'Navidad', tipo: 'inamovible' };

describe('etiquetaDelDia (lo que lee el lector de pantalla)', () => {
  it('día libre común', () => {
    expect(etiquetaDelDia('2026-11-14', 'libre', 150000)).toBe('sábado 14 de noviembre, libre, $150.000');
  });

  it('día libre sin precio', () => {
    expect(etiquetaDelDia('2026-11-14', 'libre', null)).toBe('sábado 14 de noviembre, libre, precio a consultar');
  });

  it('día libre que es feriado', () => {
    expect(etiquetaDelDia('2026-12-25', 'libre', 500000, NAVIDAD)).toBe(
      'viernes 25 de diciembre, feriado: Navidad, libre, $500.000',
    );
  });

  it('día no disponible que es feriado', () => {
    expect(etiquetaDelDia('2026-12-25', 'ocupado', 500000, NAVIDAD)).toBe('viernes 25 de diciembre, feriado: Navidad, ocupado');
  });

  it('describe cada estado no disponible', () => {
    expect(etiquetaDelDia('2026-11-15', 'domingo')).toBe('domingo 15 de noviembre, no se alquila');
    expect(etiquetaDelDia('2026-11-14', 'pendiente')).toBe('sábado 14 de noviembre, pendiente');
    expect(etiquetaDelDia('2026-11-01', 'pasado')).toBe('domingo 1 de noviembre, ya pasó');
    expect(etiquetaDelDia('2027-06-05', 'fuera-de-rango')).toBe('sábado 5 de junio, todavía no se puede reservar');
  });
});

describe('feriadosPorDia', () => {
  it('arma un índice por fecha', () => {
    expect(feriadosPorDia([NAVIDAD])).toEqual({ '2026-12-25': NAVIDAD });
  });

  it('tolera que no haya datos', () => {
    expect(feriadosPorDia(undefined)).toEqual({});
    expect(feriadosPorDia(null)).toEqual({});
  });
});
