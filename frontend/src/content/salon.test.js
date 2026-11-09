import { describe, expect, it } from 'vitest';
import { SALON, whatsappConTexto } from './salon';

describe('WhatsApp del salón', () => {
  it('usa el formato internacional argentino para celulares (54 9 + área + número)', () => {
    expect(SALON.whatsappUrl).toBe('https://wa.me/5492604119865');
  });
  it('agrega el mensaje codificado', () => {
    expect(whatsappConTexto('Hola, ¿hay lugar?')).toBe('https://wa.me/5492604119865?text=Hola%2C%20%C2%BFhay%20lugar%3F');
  });
});
