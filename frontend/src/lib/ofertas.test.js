import { describe, expect, it } from 'vitest';
import { descuentoPorcentaje, estaEnOferta, montoSena, precioDe, precioNormalDe } from './fechas';
import { ofertasVisibles } from './ofertas';

const EN_OFERTA = { dia: '2026-11-28', estado: 'disponible', valor_estimado: 180000, valor_oferta: 130000 };

describe('precio de una fecha en oferta', () => {
  it('el precio que vale es el de oferta', () => {
    expect(precioDe(EN_OFERTA)).toBe(130000);
    expect(precioNormalDe(EN_OFERTA)).toBe(180000);
    expect(estaEnOferta(EN_OFERTA)).toBe(true);
  });

  it('la seña se calcula sobre el precio de oferta', () => {
    expect(montoSena(precioDe(EN_OFERTA))).toBe(39000);
  });

  it('calcula el porcentaje de descuento', () => {
    expect(descuentoPorcentaje(EN_OFERTA)).toBe(28);
  });

  it('sin oferta todo sigue como antes', () => {
    const normal = { valor_estimado: 180000, valor_oferta: null };
    expect(precioDe(normal)).toBe(180000);
    expect(estaEnOferta(normal)).toBe(false);
    expect(descuentoPorcentaje(normal)).toBeNull();
  });

  it('oferta sin precio normal: vale la oferta y no hay nada que tachar', () => {
    const sinNormal = { valor_estimado: 0, valor_oferta: 90000 };
    expect(precioDe(sinNormal)).toBe(90000);
    expect(precioNormalDe(sinNormal)).toBeNull();
    expect(descuentoPorcentaje(sinNormal)).toBeNull();
  });

  it('si el precio normal quedó por debajo de la oferta, vale la oferta pero no se muestra descuento', () => {
    const raro = { valor_estimado: 100000, valor_oferta: 130000 };
    expect(precioDe(raro)).toBe(130000);
    expect(descuentoPorcentaje(raro)).toBeNull();
  });

  it('una oferta en 0 o inválida no cuenta', () => {
    expect(estaEnOferta({ valor_estimado: 180000, valor_oferta: 0 })).toBe(false);
    expect(precioDe({ valor_estimado: 180000, valor_oferta: 'x' })).toBe(180000);
  });
});

describe('ofertasVisibles', () => {
  const HOY = '2026-11-19'; // jueves
  const f = (dia, extra = {}) => ({ dia, estado: 'disponible', valor_estimado: 180000, valor_oferta: 130000, ...extra });

  it('solo muestra ofertas de fechas reservables, ordenadas', () => {
    const fechas = [
      f('2026-12-05'),
      f('2026-11-28'),
      f('2026-11-21', { estado: 'pendiente' }),
      f('2026-11-27', { estado: 'reservada' }),
      f('2026-11-29'), // domingo
      f('2026-11-18'), // pasada
      f('2027-03-06'), // a más de 90 días
      f('2026-11-20', { valor_oferta: null }),
    ];
    expect(ofertasVisibles(fechas, HOY).map((x) => x.dia)).toEqual(['2026-11-28', '2026-12-05']);
  });

  it('sin fechas devuelve una lista vacía', () => {
    expect(ofertasVisibles(undefined, HOY)).toEqual([]);
  });
});
