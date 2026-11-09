import { describe, expect, it } from 'vitest';
import { sesionValida } from './sesion';

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const token = (payload) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.x`;
const AHORA = Date.UTC(2026, 10, 10, 12, 0, 0);

describe('sesionValida', () => {
  it('devuelve rol y nombre de un token vigente', () => {
    const t = token({ role: 'cliente', nombre: 'Laura', exp: AHORA / 1000 + 3600 });
    expect(sesionValida(t, AHORA)).toEqual({ role: 'cliente', nombre: 'Laura' });
  });
  it('rechaza un token vencido', () => {
    const t = token({ role: 'cliente', nombre: 'Laura', exp: AHORA / 1000 - 1 });
    expect(sesionValida(t, AHORA)).toBeNull();
  });
  it('rechaza tokens corruptos o ausentes', () => {
    expect(sesionValida('basura', AHORA)).toBeNull();
    expect(sesionValida(null, AHORA)).toBeNull();
  });
});
