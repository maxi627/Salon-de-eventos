import { formatoFechaLarga } from './fechas';

// Turnos del salón. El día se reserva online; la noche se consulta por WhatsApp.
// Tiene que coincidir con App/turnos.py (HORARIOS).
export const TURNOS = {
  dia: { nombre: 'Día', desde: '11:00', hasta: '19:00', texto: '11 a 19 hs' },
  noche: { nombre: 'Noche', desde: '20:30', hasta: '04:30', texto: '20:30 a 4:30 hs' },
  completo: { nombre: 'Completo', desde: '11:00', hasta: '04:30', texto: '11 a 4:30 hs' },
};

// Mensaje para pedir el turno noche de una fecha por WhatsApp.
export function textoWhatsappNoche(dia) {
  return `Hola, quiero consultar por el turno noche del ${formatoFechaLarga(dia)}.`;
}
