import { esReservable, estaEnOferta } from './fechas';

// Fechas en oferta que se pueden mostrar: reservables (libres, no domingo, de hoy a 90 días)
// y con precio de oferta, ordenadas de la más próxima a la más lejana.
export function ofertasVisibles(fechas, hoy) {
  return (fechas ?? [])
    .filter((f) => estaEnOferta(f) && esReservable(f.dia, f, hoy))
    .sort((a, b) => a.dia.localeCompare(b.dia));
}
