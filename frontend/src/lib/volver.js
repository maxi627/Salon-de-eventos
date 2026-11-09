// Valida el parámetro "volver" del login: solo rutas del propio sitio,
// para que nadie pueda usar el enlace de login para mandar a la gente a otro dominio.
export function volverSeguro(valor) {
  if (typeof valor !== 'string' || !valor.startsWith('/')) return null;
  if (valor[1] === '/' || valor[1] === '\\') return null;
  if (valor.includes(':')) return null;
  return valor;
}
