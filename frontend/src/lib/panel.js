// Pestañas del panel de administración (las claves que se guardan en localStorage).
export const PESTANAS_PANEL = ['accounting', 'prices', 'offers', 'expenses', 'reservations', 'reintegros', 'users'];

// Pestaña con la que abre el panel: la última usada si todavía existe; si no, Contabilidad.
export function pestanaInicial(guardada) {
  return PESTANAS_PANEL.includes(guardada) ? guardada : 'accounting';
}
