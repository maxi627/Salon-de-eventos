import { describe, expect, it } from 'vitest';
import { TURNOS, textoWhatsappNoche } from './turnos';

describe('turnos', () => {
  it('tiene los horarios de cada turno', () => {
    expect(TURNOS.dia).toMatchObject({ nombre: 'Día', desde: '11:00', hasta: '19:00', texto: '11 a 19 hs' });
    expect(TURNOS.noche).toMatchObject({ nombre: 'Noche', desde: '20:30', hasta: '04:30', texto: '20:30 a 4:30 hs' });
    expect(TURNOS.completo).toMatchObject({ nombre: 'Completo', desde: '11:00', hasta: '04:30', texto: '11 a 4:30 hs' });
  });

  it('arma el mensaje de WhatsApp para consultar una noche', () => {
    expect(textoWhatsappNoche('2026-12-05')).toBe('Hola, quiero consultar por el turno noche del sábado 5 de diciembre.');
  });
});
