import { formatoFechaLarga, formatoPesos } from './fechas';

const DESCRIPCION = {
  pendiente: 'pendiente',
  ocupado: 'ocupado',
  domingo: 'no se alquila',
  pasado: 'ya pasó',
  'fuera-de-rango': 'todavía no se puede reservar',
};

// Texto que lee el lector de pantalla para un día del calendario de reservas.
export function etiquetaDelDia(texto, estado, precio, feriado) {
  const partes = [formatoFechaLarga(texto)];
  if (feriado) partes.push(`feriado: ${feriado.nombre}`);
  if (estado === 'libre') partes.push('libre', precio ? formatoPesos(precio) : 'precio a consultar');
  else partes.push(DESCRIPCION[estado]);
  return partes.join(', ');
}

// { 'YYYY-MM-DD': feriado } a partir de la lista que devuelve la API.
export function feriadosPorDia(feriados) {
  return Object.fromEntries((feriados ?? []).map((f) => [f.fecha, f]));
}
