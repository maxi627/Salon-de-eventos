// Valida el parámetro "volver" del login: solo rutas del propio sitio,
// para que nadie pueda usar el enlace de login para mandar a la gente a otro dominio.

// El navegador descarta tabs y saltos de línea al armar una URL ("/<tab>/x.com" termina en
// "//x.com", otro dominio), así que no se acepta ningún carácter de control ni espacio.
function tieneControlOEspacio(texto) {
  for (const caracter of texto) {
    const codigo = caracter.codePointAt(0);
    if (codigo <= 0x20 || codigo === 0x7f || /\s/.test(caracter)) return true;
  }
  return false;
}

export function volverSeguro(valor) {
  if (typeof valor !== 'string' || !valor.startsWith('/')) return null;
  if (tieneControlOEspacio(valor)) return null;
  if (valor[1] === '/' || valor[1] === '\\') return null;
  if (valor.includes(':')) return null;
  return valor;
}
