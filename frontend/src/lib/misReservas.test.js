import { describe, expect, it } from 'vitest';
import { reservasVisibles } from './misReservas';

const HOY = '2026-11-19';
const r = (id, dia, estado = 'confirmada') => ({ id, estado, fecha: { dia } });

describe('reservasVisibles (Mis reservas)', () => {
  it('muestra las futuras y las de los últimos 30 días, ordenadas por fecha', () => {
    const reservas = [
      r(1, '2026-12-05'),
      r(2, '2026-10-20'), // hace 30 días: se ve
      r(3, '2026-10-19'), // hace 31 días: no se ve
      r(4, HOY),
      r(5, '2026-11-01', 'cancelada'),
    ];
    expect(reservasVisibles(reservas, HOY).map((x) => x.id)).toEqual([2, 5, 4, 1]);
  });

  it('no muestra las archivadas ni las que no tienen fecha', () => {
    const reservas = [r(1, '2026-12-05', 'archivada'), { id: 2, estado: 'confirmada', fecha: null }, r(3, '2026-12-06')];
    expect(reservasVisibles(reservas, HOY).map((x) => x.id)).toEqual([3]);
  });

  it('tolera que no haya datos', () => {
    expect(reservasVisibles(undefined, HOY)).toEqual([]);
  });
});
