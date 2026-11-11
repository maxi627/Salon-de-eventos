import { describe, expect, it } from 'vitest';
import { fechasDelDiaDeSemana, motivoDelError, resumenActualizacion } from './preciosMasivos';

const SABADO = 6;
const DOMINGO = 0;
const diaDeSemana = (texto) => new Date(`${texto}T12:00:00`).getDay();

describe('fechasDelDiaDeSemana', () => {
  it('a las 22:49 (en UTC ya es el día siguiente) devuelve sábados, no domingos', () => {
    const ahora = new Date(2026, 10, 10, 22, 49); // martes 10/11/2026, 22:49 en Argentina
    const fechas = fechasDelDiaDeSemana(SABADO, 3, ahora);
    expect(fechas[0]).toBe('2026-11-14');
    expect(fechas.every((f) => diaDeSemana(f) === SABADO)).toBe(true);
  });

  it('da el mismo resultado de mañana que de noche', () => {
    const manana = fechasDelDiaDeSemana(SABADO, 3, new Date(2026, 10, 10, 9, 0));
    const noche = fechasDelDiaDeSemana(SABADO, 3, new Date(2026, 10, 10, 23, 59));
    expect(noche).toEqual(manana);
  });

  it('cubre el rango de meses elegido, de hoy en adelante', () => {
    const fechas = fechasDelDiaDeSemana(SABADO, 3, new Date(2026, 10, 10, 22, 49));
    expect(fechas).toHaveLength(13);
    expect(fechas.at(-1)).toBe('2027-02-06');
    expect(fechasDelDiaDeSemana(SABADO, 1, new Date(2026, 10, 10, 10, 0))).toEqual([
      '2026-11-14', '2026-11-21', '2026-11-28', '2026-12-05',
    ]);
  });

  it('incluye hoy si es el día elegido', () => {
    const domingo = new Date(2026, 10, 15, 22, 0);
    expect(fechasDelDiaDeSemana(DOMINGO, 1, domingo)[0]).toBe('2026-11-15');
  });

  it('acepta el día como texto, tal como llega del select', () => {
    expect(fechasDelDiaDeSemana('6', 1, new Date(2026, 10, 10, 22, 49))[0]).toBe('2026-11-14');
  });
});

describe('resumenActualizacion', () => {
  it('informa éxito solo si todas las fechas se guardaron', () => {
    const r = resumenActualizacion([
      { dia: '2026-11-14', ok: true },
      { dia: '2026-11-21', ok: true },
    ]);
    expect(r).toEqual({ ok: true, texto: 'Se actualizaron las 2 fechas.' });
  });

  it('informa cuáles fallaron y por qué', () => {
    const r = resumenActualizacion([
      { dia: '2026-11-14', ok: true },
      { dia: '2026-12-26', ok: false, motivo: 'Sesión vencida' },
      { dia: '2027-01-02', ok: false, motivo: 'Demasiados pedidos' },
    ]);
    expect(r.ok).toBe(false);
    expect(r.texto).toBe(
      'Se actualizaron 1 de 3 fechas. Fallaron: 26/12/2026 (Sesión vencida), 02/01/2027 (Demasiados pedidos).',
    );
  });

  it('avisa si no había fechas para actualizar', () => {
    expect(resumenActualizacion([])).toEqual({ ok: false, texto: 'No hay fechas para actualizar en ese rango.' });
  });
});

describe('motivoDelError', () => {
  it('traduce los códigos más comunes', () => {
    expect(motivoDelError(401)).toBe('sesión vencida, volvé a iniciar sesión');
    expect(motivoDelError(403)).toBe('sin permiso de administrador');
    expect(motivoDelError(429)).toBe('demasiados pedidos seguidos, esperá un minuto');
  });

  it('usa el mensaje del servidor para el resto', () => {
    expect(motivoDelError(422, 'Error de validación')).toBe('Error de validación');
    expect(motivoDelError(500)).toBe('error 500 del servidor');
  });
});
