import { jwtDecode } from 'jwt-decode';

// Devuelve los datos de la sesión si el token se puede leer y no venció; si no, null.
// No verifica la firma (eso lo hace el backend en cada pedido).
export function sesionValida(token, ahora = Date.now()) {
  if (!token) return null;
  try {
    const { role, nombre, exp } = jwtDecode(token);
    if (!exp || exp * 1000 <= ahora) return null;
    return { role, nombre };
  } catch {
    return null;
  }
}
