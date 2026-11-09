// Capturas de las páginas públicas y del panel, contra `npm run dev:mock`.
// Uso: node scripts/capturas.mjs <etiqueta> [--url http://localhost:5173] [--peso]
// Guarda los PNG en .capturas/<etiqueta>/ y sale con código 1 si alguna página desborda.
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const etiqueta = args.find((a) => !a.startsWith('--')) ?? 'sin-etiqueta';
const iUrl = args.indexOf('--url');
const BASE = iUrl >= 0 ? args[iUrl + 1] : 'http://localhost:5173';
const medirPeso = args.includes('--peso');
const NAVEGADOR = process.env.NAVEGADOR ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const ANCHOS = [320, 390, 1366];
const salida = path.resolve('.capturas', etiqueta);
mkdirSync(salida, { recursive: true });

function nombreArchivo(ruta, ancho) {
  const limpio = ruta === '/' ? 'inicio' : ruta.replace(/^\//, '').replace(/[/?=]/g, '_');
  return path.join(salida, `${limpio}-${ancho}.png`);
}

async function iniciarSesion(page, correo) {
  await page.goto(BASE + '/');
  await page.evaluate(async (c) => {
    const r = await fetch('/api/v1/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ correo: c, password: 'x' }) });
    const j = await r.json();
    localStorage.setItem('authToken', j.data.token);
  }, correo);
}

async function primeraLibre(page) {
  await page.goto(BASE + '/');
  return page.evaluate(async () => {
    const r = await fetch('/api/v1/fecha');
    const j = await r.json();
    return j.data.find((f) => f.estado === 'disponible' && f.valor_estimado)?.dia;
  });
}

const navegador = await chromium.launch({ executablePath: NAVEGADOR });
let desbordes = 0;
try {
  const contexto = await navegador.newContext();
  const page = await contexto.newPage();
  const libre = await primeraLibre(page);

  const rutas = [
    { ruta: '/' },
    { ruta: '/reservar' },
    { ruta: `/reservar?fecha=${libre}` },
    { ruta: `/reservar/${libre}`, sesion: 'cliente@prueba.com' },
    { ruta: '/mis-reservas', sesion: 'cliente@prueba.com' },
    { ruta: '/login' },
    { ruta: '/register' },
    { ruta: '/forgot-password' },
    { ruta: '/arrepentimiento' },
    { ruta: '/privacidad' },
    { ruta: '/admin-panel', sesion: 'admin@prueba.com', sinChequeo: true },
  ];

  for (const { ruta, sesion, sinChequeo } of rutas) {
    await page.evaluate(() => localStorage.clear());
    if (sesion) await iniciarSesion(page, sesion);
    for (const ancho of ANCHOS) {
      await page.setViewportSize({ width: ancho, height: 844 });
      // Turnstile mantiene conexiones abiertas: esperamos la carga y un margen fijo.
      await page.goto(BASE + ruta, { waitUntil: 'load' });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: nombreArchivo(ruta, ancho), fullPage: true });
      if (!sinChequeo) {
        const desborda = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        if (desborda) {
          desbordes += 1;
          console.log(`DESBORDA ${ruta} ${ancho}`);
        }
      }
    }
  }

  if (medirPeso) {
    const contextoPeso = await navegador.newContext({ viewport: { width: 390, height: 844 } });
    const p = await contextoPeso.newPage();
    let bytes = 0;
    p.on('response', async (r) => {
      if ((r.headers()['content-type'] ?? '').startsWith('image/')) {
        try { bytes += (await r.body()).length; } catch { /* respuesta sin cuerpo */ }
      }
    });
    await p.goto(BASE + '/', { waitUntil: 'load' });
    await p.waitForTimeout(800);
    console.log(`PESO imágenes del inicio (390 px, sin scrollear): ${(bytes / 1024).toFixed(0)} KB`);
  }
} finally {
  await navegador.close();
}

console.log(`Capturas en ${salida}`);
process.exit(desbordes > 0 ? 1 : 0);
