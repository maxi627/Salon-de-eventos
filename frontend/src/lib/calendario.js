import { formatoFechaLarga, formatoPesos } from './fechas';

const DESCRIPCION = {
  pendiente: 'pendiente',
  ocupado: 'ocupado',
  domingo: 'no se alquila',
  pasado: 'ya pasó',
  'fuera-de-rango': 'todavía no se puede reservar',
};

// Texto que lee el lector de pantalla para un día del calendario de reservas.
const NOCHE = { libre: 'noche libre', pendiente: 'noche pendiente', ocupado: 'noche ocupada' };

// `noche`: estado del turno noche ('libre' | 'pendiente' | 'ocupado') o null si no aplica.
export function etiquetaDelDia(texto, estado, precio, feriado, enOferta = false, noche = null) {
  const partes = [formatoFechaLarga(texto)];
  if (feriado) partes.push(`feriado: ${feriado.nombre}`);
  if (estado === 'libre') partes.push('libre', precio ? formatoPesos(precio) : 'precio a consultar');
  else partes.push(DESCRIPCION[estado]);
  if (enOferta && estado === 'libre') partes.push('en oferta');
  if (noche) partes.push(NOCHE[noche]);
  return partes.join(', ');
}

// { 'YYYY-MM-DD': feriado } a partir de la lista que devuelve la API.
export function feriadosPorDia(feriados) {
  return Object.fromEntries((feriados ?? []).map((f) => [f.fecha, f]));
}
