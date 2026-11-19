import { sumarDias } from './fechas';

// Cuántos días hacia atrás siguen apareciendo las reservas que ya pasaron.
export const DIAS_HACIA_ATRAS = 30;

// Reservas que se muestran en "Mis reservas": las futuras y las de los últimos 30 días,
// sin las archivadas, ordenadas de la más próxima a la más lejana.
export function reservasVisibles(reservas, hoy) {
  const desde = sumarDias(hoy, -DIAS_HACIA_ATRAS);
  return (reservas ?? [])
    .filter((r) => r.fecha?.dia && r.estado !== 'archivada' && r.fecha.dia >= desde)
    .sort((a, b) => a.fecha.dia.localeCompare(b.fecha.dia));
}
