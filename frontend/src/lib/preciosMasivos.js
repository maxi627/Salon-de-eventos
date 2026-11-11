import { aTextoFecha } from './fechas';

// Fechas ('YYYY-MM-DD', hora local) del día de la semana elegido (0 = domingo … 6 = sábado),
// desde hoy hasta dentro de `meses` meses. Se arma con la fecha local y no con toISOString:
// después de las 21 h, en UTC ya es el día siguiente y se corrían todas un día.
export function fechasDelDiaDeSemana(diaSemana, meses, ahora = new Date()) {
  const dia = Number(diaSemana);
  const actual = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const fin = new Date(actual);
  fin.setMonth(fin.getMonth() + Number(meses));

  const fechas = [];
  while (actual <= fin) {
    if (actual.getDay() === dia) fechas.push(aTextoFecha(actual));
    actual.setDate(actual.getDate() + 1);
  }
  return fechas;
}

// Fechas ('YYYY-MM-DD') de los feriados que caen desde hoy hasta dentro de `meses` meses.
export function fechasDeFeriados(feriados, meses, ahora = new Date()) {
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const fin = new Date(hoy);
  fin.setMonth(fin.getMonth() + Number(meses));
  const [desde, hasta] = [aTextoFecha(hoy), aTextoFecha(fin)];
  const fechas = (feriados ?? []).map((f) => f.fecha).filter((f) => f >= desde && f <= hasta);
  return [...new Set(fechas)].sort();
}

function fechaCorta(texto) {
  const [y, m, d] = texto.split('-');
  return `${d}/${m}/${y}`;
}

// Mensaje final de la actualización masiva a partir del resultado de cada fecha
// ({ dia, ok, motivo }). Solo es éxito si se guardaron todas.
export function resumenActualizacion(resultados) {
  if (resultados.length === 0) return { ok: false, texto: 'No hay fechas para actualizar en ese rango.' };

  const fallidas = resultados.filter((r) => !r.ok);
  if (fallidas.length === 0) return { ok: true, texto: `Se actualizaron las ${resultados.length} fechas.` };

  const detalle = fallidas.map((r) => `${fechaCorta(r.dia)} (${r.motivo})`).join(', ');
  return {
    ok: false,
    texto: `Se actualizaron ${resultados.length - fallidas.length} de ${resultados.length} fechas. Fallaron: ${detalle}.`,
  };
}

const MOTIVOS = {
  401: 'sesión vencida, volvé a iniciar sesión',
  403: 'sin permiso de administrador',
  429: 'demasiados pedidos seguidos, esperá un minuto',
};

// Motivo legible de una respuesta fallida de la API.
export function motivoDelError(status, mensajeDelServidor) {
  return MOTIVOS[status] ?? mensajeDelServidor ?? `error ${status} del servidor`;
}
