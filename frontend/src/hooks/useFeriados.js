import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { feriadosPorDia } from '../lib/calendario';

// Feriados nacionales (GET /api/v1/feriado). Son opcionales: si la consulta falla,
// el calendario funciona igual, solo que sin marcarlos.
async function pedirFeriados() {
  const respuesta = await fetch('/api/v1/feriado');
  if (!respuesta.ok) throw new Error('No se pudieron cargar los feriados');
  const cuerpo = await respuesta.json();
  return cuerpo.data ?? [];
}

export function useFeriados() {
  const { data } = useQuery({ queryKey: ['feriados'], queryFn: pedirFeriados, staleTime: 60 * 60 * 1000, retry: 1 });
  return useMemo(() => feriadosPorDia(data), [data]);
}
