import { describe, expect, it } from 'vitest';
import { valorAlquilerSugerido } from './precioReserva';

describe('valorAlquilerSugerido', () => {
  it('respeta el valor ya guardado en la reserva', () => {
    expect(valorAlquilerSugerido(180000, 150000)).toBe(180000);
  });

  it('usa el precio del calendario si la reserva está en cero', () => {
    expect(valorAlquilerSugerido(0, 150000)).toBe(150000);
  });

  it('usa el precio del calendario si la reserva no tiene valor', () => {
    expect(valorAlquilerSugerido(null, 150000)).toBe(150000);
    expect(valorAlquilerSugerido(undefined, 150000)).toBe(150000);
  });

  it('queda en cero si el día no tiene precio cargado', () => {
    expect(valorAlquilerSugerido(0, 0)).toBe(0);
    expect(valorAlquilerSugerido(0, null)).toBe(0);
    expect(valorAlquilerSugerido(0, undefined)).toBe(0);
  });

  it('ignora valores que no son números válidos', () => {
    expect(valorAlquilerSugerido(0, NaN)).toBe(0);
    expect(valorAlquilerSugerido(0, -5000)).toBe(0);
    expect(valorAlquilerSugerido(-1, 150000)).toBe(150000);
  });
});
