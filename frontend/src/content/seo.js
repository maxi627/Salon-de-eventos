// Dominio principal del sitio: www.saloneventos.cloud redirige acá.
export const SITIO_URL = 'https://saloneventos.cloud';

// URL canónica de una página: sin consulta, ancla ni barra final (salvo el inicio).
export function urlCanonica(ruta) {
  const camino = ruta.split(/[?#]/)[0].replace(/\/+$/, '');
  return `${SITIO_URL}${camino || '/'}`;
}
