import { describe, expect, it } from 'vitest';
import {
  DIAS_MAXIMOS,
  esDomingo,
  esReservable,
  estadoDelDia,
  formatoFechaLarga,
  formatoPesos,
  hoyLocal,
  montoSena,
  precioDe,
  proximasFechasLibres,
  sumarDias,
} from './fechas';

// Martes: los días 90 y 91 caen lunes 2027-02-08 y martes 2027-02-09.
const HOY = '2026-11-10';

describe('hoyLocal', () => {
  it('usa el día local aunque en UTC ya sea el día siguiente', () => {
    expect(hoyLocal(new Date(2026, 10, 9, 23, 30))).toBe('2026-11-09');
  });
});

describe('sumarDias', () => {
  it('suma días cruzando meses y años', () => {
    expect(sumarDias(HOY, 90)).toBe('2027-02-08');
    expect(DIAS_MAXIMOS).toBe(90);
  });
});

describe('esDomingo', () => {
  it('reconoce domingos y no otros días', () => {
    expect(esDomingo('2026-11-15')).toBe(true);
    expect(esDomingo('2026-11-14')).toBe(false);
  });
});

describe('estadoDelDia', () => {
  it('marca los domingos como domingo', () => {
    expect(estadoDelDia('2026-11-15', undefined, HOY)).toBe('domingo');
  });
  it('marca los días anteriores a hoy como pasados', () => {
    expect(estadoDelDia('2026-11-09', undefined, HOY)).toBe('pasado');
  });
  it('el día 90 se puede elegir y el 91 queda fuera de rango', () => {
    expect(estadoDelDia('2027-02-08', undefined, HOY)).toBe('libre');
    expect(estadoDelDia('2027-02-09', undefined, HOY)).toBe('fuera-de-rango');
  });
  it('traduce los estados de la API', () => {
    expect(estadoDelDia('2026-11-14', { estado: 'reservada' }, HOY)).toBe('ocupado');
    expect(estadoDelDia('2026-11-14', { estado: 'pendiente' }, HOY)).toBe('pendiente');
    expect(estadoDelDia('2026-11-14', { estado: 'disponible' }, HOY)).toBe('libre');
  });
  it('un domingo sigue siendo domingo aunque la API diga disponible', () => {
    expect(estadoDelDia('2026-11-15', { estado: 'disponible' }, HOY)).toBe('domingo');
  });
});

describe('precioDe', () => {
  it('devuelve null si no hay precio útil', () => {
    expect(precioDe({ valor_estimado: 0 })).toBeNull();
    expect(precioDe({ valor_estimado: null })).toBeNull();
    expect(precioDe(undefined)).toBeNull();
  });
  it('devuelve el precio cargado', () => {
    expect(precioDe({ valor_estimado: 180000 })).toBe(180000);
  });
});

describe('montoSena', () => {
  it('es el 30% redondeado a pesos enteros', () => {
    expect(montoSena(210000)).toBe(63000);
    expect(montoSena(155555)).toBe(46667);
  });
  it('sin precio no hay monto', () => {
    expect(montoSena(null)).toBeNull();
  });
});

describe('esReservable', () => {
  it('rechaza textos que no son fechas', () => {
    expect(esReservable('2026-13-40', undefined, HOY)).toBe(false);
    expect(esReservable('hola', undefined, HOY)).toBe(false);
    expect(esReservable(undefined, undefined, HOY)).toBe(false);
  });
  it('acepta un día libre y rechaza domingos y ocupados', () => {
    expect(esReservable('2026-11-14', undefined, HOY)).toBe(true);
    expect(esReservable('2026-11-15', undefined, HOY)).toBe(false);
    expect(esReservable('2026-11-14', { estado: 'reservada' }, HOY)).toBe(false);
  });
});

describe('proximasFechasLibres', () => {
  const fechas = [
    { dia: '2026-11-11', estado: 'disponible', valor_estimado: 150000 }, // miércoles
    { dia: '2026-11-13', estado: 'disponible', valor_estimado: 190000 }, // viernes
    { dia: '2026-11-14', estado: 'reservada', valor_estimado: 210000 }, // sábado ocupado
    { dia: '2026-11-15', estado: 'disponible', valor_estimado: 210000 }, // domingo
    { dia: '2026-11-09', estado: 'disponible', valor_estimado: 150000 }, // pasado
    { dia: '2026-11-21', estado: 'disponible', valor_estimado: 210000 }, // sábado
    { dia: '2026-11-20', estado: 'pendiente', valor_estimado: 190000 }, // viernes pendiente
    { dia: '2026-11-12', estado: 'disponible', valor_estimado: null }, // jueves sin precio
    { dia: '2026-11-16', estado: 'disponible', valor_estimado: 150000 }, // lunes
  ];

  it('pone viernes y sábados primero y después el resto, en orden', () => {
    expect(proximasFechasLibres(fechas, HOY).map((f) => f.dia)).toEqual([
      '2026-11-13',
      '2026-11-21',
      '2026-11-11',
      '2026-11-16',
    ]);
  });
  it('respeta el máximo pedido', () => {
    expect(proximasFechasLibres(fechas, HOY, 2).map((f) => f.dia)).toEqual(['2026-11-13', '2026-11-21']);
  });
});

describe('formatos', () => {
  it('formatea pesos sin decimales', () => {
    expect(formatoPesos(210000)).toBe('$210.000');
  });
  it('formatea la fecha larga en español', () => {
    expect(formatoFechaLarga('2026-11-14')).toBe('sábado 14 de noviembre');
  });
});
