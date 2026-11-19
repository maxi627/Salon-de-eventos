// Reglas de fechas, precios y seña que comparten el inicio, el calendario y la reserva.
// Las fechas viajan siempre como texto 'YYYY-MM-DD' en hora local (Argentina):
// nunca se usa toISOString, que después de las 21 h devuelve el día siguiente.

export const DIAS_MAXIMOS = 90;
const PORCENTAJE_SENA = 0.3;
const FORMATO = /^\d{4}-\d{2}-\d{2}$/;

export function aTextoFecha(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function aFecha(texto) {
  const [y, m, d] = texto.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function esTextoValido(texto) {
  return typeof texto === 'string' && FORMATO.test(texto) && aTextoFecha(aFecha(texto)) === texto;
}

export function hoyLocal(ahora = new Date()) {
  return aTextoFecha(ahora);
}

export function sumarDias(texto, n) {
  const fecha = aFecha(texto);
  fecha.setDate(fecha.getDate() + n);
  return aTextoFecha(fecha);
}

export function esDomingo(texto) {
  return aFecha(texto).getDay() === 0;
}

const ESTADOS_API = { disponible: 'libre', pendiente: 'pendiente', reservada: 'ocupado' };

export function estadoDelDia(texto, infoApi, hoy) {
  if (texto < hoy) return 'pasado';
  if (esDomingo(texto)) return 'domingo';
  if (texto > sumarDias(hoy, DIAS_MAXIMOS)) return 'fuera-de-rango';
  return ESTADOS_API[infoApi?.estado] ?? 'libre';
}

function montoPositivo(valor) {
  const n = Number(valor);
  return valor != null && Number.isFinite(n) && n > 0 ? n : null;
}

// Precio que vale para la fecha: el de oferta si tiene uno; si no, el normal.
// Calendario, resumen, seña y confirmación usan este, así una oferta se ve igual en todos lados.
export function precioDe(infoApi) {
  return montoPositivo(infoApi?.valor_oferta) ?? montoPositivo(infoApi?.valor_estimado);
}

export function precioNormalDe(infoApi) {
  return montoPositivo(infoApi?.valor_estimado);
}

export function estaEnOferta(infoApi) {
  return montoPositivo(infoApi?.valor_oferta) !== null;
}

// Porcentaje de descuento sobre el precio normal (null si no hay contra qué comparar).
export function descuentoPorcentaje(infoApi) {
  const oferta = montoPositivo(infoApi?.valor_oferta);
  const normal = precioNormalDe(infoApi);
  if (oferta === null || normal === null || oferta >= normal) return null;
  return Math.round((1 - oferta / normal) * 100);
}

export function esReservable(texto, infoApi, hoy) {
  return esTextoValido(texto) && estadoDelDia(texto, infoApi, hoy) === 'libre';
}

export function montoSena(valor) {
  return valor == null ? null : Math.round(valor * PORCENTAJE_SENA);
}

function esFinDeSemana(texto) {
  const dia = aFecha(texto).getDay();
  return dia === 5 || dia === 6;
}

export function proximasFechasLibres(fechas, hoy, n = 5) {
  const libres = fechas
    .filter((f) => esReservable(f.dia, f, hoy) && precioDe(f) !== null)
    .sort((a, b) => a.dia.localeCompare(b.dia));
  const findes = libres.filter((f) => esFinDeSemana(f.dia));
  const resto = libres.filter((f) => !esFinDeSemana(f.dia));
  return [...findes, ...resto].slice(0, n);
}

export function formatoFechaLarga(texto) {
  // Intl agrega una coma después del día de la semana ("sábado, 14…"); la armamos a mano.
  const fecha = aFecha(texto);
  const diaSemana = fecha.toLocaleDateString('es-AR', { weekday: 'long' });
  const mes = fecha.toLocaleDateString('es-AR', { month: 'long' });
  return `${diaSemana} ${fecha.getDate()} de ${mes}`;
}

export function formatoPesos(n) {
  return `$${Math.round(n).toLocaleString('es-AR')}`;
}
