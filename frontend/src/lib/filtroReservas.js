// Filtros de "Gestión de reservas" (panel admin). Las fechas son textos locales YYYY-MM-DD,
// así que se comparan como strings.

const DIA_MES_ANIO = /^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2}|\d{4}))?$/;
const ANIO_MES_DIA = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

// Si el texto del buscador es una fecha ("24/12", "24-12-2026", "2026-12-24"), devuelve
// { dia, mes, anio } (anio = null si no se escribió). Si no, null: se busca como nombre o DNI.
export function leerFechaEscrita(texto) {
  const limpio = (texto ?? '').trim();
  let dia, mes, anio;
  const iso = limpio.match(ANIO_MES_DIA);
  const corta = limpio.match(DIA_MES_ANIO);
  if (iso) {
    [anio, mes, dia] = iso.slice(1).map(Number);
  } else if (corta) {
    [dia, mes] = corta.slice(1, 3).map(Number);
    anio = corta[3] ? Number(corta[3]) : null;
    if (anio !== null && anio < 100) anio += 2000;
  } else {
    return null;
  }
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;
  return { dia, mes, anio };
}

function coincideConFechaEscrita(diaTexto, fecha) {
  const [anio, mes, dia] = diaTexto.split('-').map(Number);
  return dia === fecha.dia && mes === fecha.mes && (fecha.anio === null || anio === fecha.anio);
}

// Reservas a mostrar, ordenadas por fecha. Las pasadas se incluyen con "Ver pasadas", con
// cualquier filtro de fecha activo o cuando la lista viene de una búsqueda por nombre/DNI.
export function filtrarReservas(
  reservas,
  { hoy, verPasadas = false, estado = 'todas', desde = '', hasta = '', fechaEscrita = null, esBusqueda = false },
) {
  let [inicio, fin] = [desde, hasta];
  if (inicio && fin && inicio > fin) [inicio, fin] = [fin, inicio];
  const incluirPasadas = verPasadas || esBusqueda || Boolean(inicio || fin || fechaEscrita);

  return (reservas ?? [])
    .filter((r) => {
      const dia = r.fecha?.dia;
      if (!dia) return false;
      if (!incluirPasadas && dia < hoy) return false;
      if (inicio && dia < inicio) return false;
      if (fin && dia > fin) return false;
      if (fechaEscrita && !coincideConFechaEscrita(dia, fechaEscrita)) return false;
      if (estado !== 'todas' && r.estado !== estado) return false;
      return true;
    })
    .sort((a, b) => a.fecha.dia.localeCompare(b.fecha.dia));
}
