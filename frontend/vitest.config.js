import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
    // Hora de Argentina, como la de quienes usan el sitio: así se detectan los corrimientos de fecha
    // (por ejemplo, toISOString después de las 21 h) sin depender de la zona de la máquina.
    env: { TZ: 'America/Argentina/Buenos_Aires' },
  },
});
