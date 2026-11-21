import { describe, expect, it } from 'vitest';
import { filtrarReservas, leerFechaEscrita } from './filtroReservas';

const HOY = '2026-11-21';
const r = (id, dia, estado = 'confirmada') => ({ id, estado, fecha: { dia } });
const ids = (lista) => lista.map((x) => x.id);

describe('leerFechaEscrita', () => {
  it('entiende día y mes con barra o guion', () => {
    expect(leerFechaEscrita('24/12')).toEqual({ dia: 24, mes: 12, anio: null });
    expect(leerFechaEscrita('5-1')).toEqual({ dia: 5, mes: 1, anio: null });
    expect(leerFechaEscrita(' 08/12 ')).toEqual({ dia: 8, mes: 12, anio: null });
  });

  it('entiende el año con 4 o 2 cifras y el formato año-mes-día', () => {
    expect(leerFechaEscrita('24/12/2026')).toEqual({ dia: 24, mes: 12, anio: 2026 });
    expect(leerFechaEscrita('1-2-27')).toEqual({ dia: 1, mes: 2, anio: 2027 });
    expect(leerFechaEscrita('2027-01-09')).toEqual({ dia: 9, mes: 1, anio: 2027 });
  });

  it('no confunde nombres, DNI ni fechas imposibles con una fecha', () => {
    expect(leerFechaEscrita('Pérez')).toBeNull();
    expect(leerFechaEscrita('30123456')).toBeNull();
    expect(leerFechaEscrita('24')).toBeNull();
    expect(leerFechaEscrita('32/12')).toBeNull();
    expect(leerFechaEscrita('10/13')).toBeNull();
    expect(leerFechaEscrita('')).toBeNull();
    expect(leerFechaEscrita(undefined)).toBeNull();
  });
});

describe('filtrarReservas', () => {
  const reservas = [
    r(1, '2026-12-24'),
    r(2, '2026-11-10'), // pasada
    r(3, '2027-12-24', 'pendiente'),
    r(4, '2026-11-21', 'pendiente'), // hoy
    r(5, '2027-01-09'),
  ];

  it('sin filtros muestra desde hoy en adelante, ordenadas por fecha', () => {
    expect(ids(filtrarReservas(reservas, { hoy: HOY }))).toEqual([4, 1, 5, 3]);
  });

  it('con "Ver pasadas" incluye las anteriores a hoy', () => {
    expect(ids(filtrarReservas(reservas, { hoy: HOY, verPasadas: true }))).toEqual([2, 4, 1, 5, 3]);
  });

  it('filtra por un rango de fechas, incluidos los extremos y las pasadas', () => {
    expect(ids(filtrarReservas(reservas, { hoy: HOY, desde: '2026-11-01', hasta: '2026-12-24' }))).toEqual([2, 4, 1]);
  });

  it('con solo "desde" o solo "hasta" deja el otro extremo abierto', () => {
    expect(ids(filtrarReservas(reservas, { hoy: HOY, desde: '2027-01-01' }))).toEqual([5, 3]);
    expect(ids(filtrarReservas(reservas, { hoy: HOY, hasta: '2026-11-21' }))).toEqual([2, 4]);
  });

  it('si el rango está invertido lo da vuelta', () => {
    expect(ids(filtrarReservas(reservas, { hoy: HOY, desde: '2026-12-24', hasta: '2026-11-01' }))).toEqual([2, 4, 1]);
  });

  it('una fecha escrita sin año busca ese día en cualquier año', () => {
    expect(ids(filtrarReservas(reservas, { hoy: HOY, fechaEscrita: leerFechaEscrita('24/12') }))).toEqual([1, 3]);
  });

  it('una fecha escrita con año busca solo ese día, aunque ya haya pasado', () => {
    expect(ids(filtrarReservas(reservas, { hoy: HOY, fechaEscrita: leerFechaEscrita('24/12/2027') }))).toEqual([3]);
    expect(ids(filtrarReservas(reservas, { hoy: HOY, fechaEscrita: leerFechaEscrita('10/11') }))).toEqual([2]);
  });

  it('combina la fecha con el estado', () => {
    expect(ids(filtrarReservas(reservas, { hoy: HOY, fechaEscrita: leerFechaEscrita('24/12'), estado: 'confirmada' }))).toEqual([1]);
    expect(ids(filtrarReservas(reservas, { hoy: HOY, estado: 'pendiente' }))).toEqual([4, 3]);
  });

  it('los resultados de una búsqueda por nombre incluyen las pasadas', () => {
    expect(ids(filtrarReservas([r(2, '2026-11-10'), r(1, '2026-12-24')], { hoy: HOY, esBusqueda: true }))).toEqual([2, 1]);
  });

  it('descarta las reservas sin fecha y tolera que no haya datos', () => {
    expect(ids(filtrarReservas([{ id: 9, estado: 'confirmada', fecha: null }, r(1, '2026-12-24')], { hoy: HOY }))).toEqual([1]);
    expect(filtrarReservas(undefined, { hoy: HOY })).toEqual([]);
  });
});
