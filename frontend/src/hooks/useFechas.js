import { useQuery } from '@tanstack/react-query';

// Fechas públicas del calendario (GET /api/v1/fecha). Las comparten el inicio y el calendario
// bajo la misma clave, así se piden una sola vez. Se usa fetch y no el cliente axios porque
// su interceptor cierra la sesión ante un 401.
async function pedirFechas() {
  const respuesta = await fetch('/api/v1/fecha');
  if (!respuesta.ok) throw new Error('No se pudieron cargar las fechas');
  const cuerpo = await respuesta.json();
  return cuerpo.data ?? [];
}

export function useFechas() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['fechas'],
    queryFn: pedirFechas,
    staleTime: 30_000,
  });
  const fechas = data ?? [];
  const porDia = Object.fromEntries(fechas.map((f) => [f.dia, f]));
  return { fechas, porDia, isLoading, isError, refetch };
}
