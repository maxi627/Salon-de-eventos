// Genera las fotos del sitio en WebP (800 y 1600 px de ancho) en public/fotos/.
// Las imágenes hechas con IA (img1–img6) se recortan un 7% a la derecha y abajo para sacar la marca ✦.
// Uso: node scripts/optimizar-fotos.mjs <carpeta-con-los-originales>
import { mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ORIGEN = path.resolve(process.argv[2] ?? 'public');
const DESTINO = path.resolve('public/fotos');
const ANCHOS = [800, 1600];
const CALIDAD = 78;

const FOTOS = [
  ['foto_salon.jpeg', 'exterior'],
  ['foto_salon_1.jpeg', 'exterior-2'],
  ['foto_salon_2.jpeg', 'parrilla'],
  ['foto_salon_3.jpeg', 'parrilla-2'],
  ['foto_salon_4.jpeg', 'parque'],
  ['foto_salon_5.jpeg', 'parque-pileta'],
  ['foto_salon_6.jpeg', 'pileta'],
  ['foto_salon_7.jpeg', 'salon-juegos'],
  ['foto_salon_8.jpeg', 'salon'],
  ['foto_salon_9.jpg', 'cocina'],
  ['foto_salon_10.jpg', 'cocina-2'],
  ['foto_salon_11.jpg', 'bano'],
  ['img1.png', 'ia-juegos', true],
  ['img2.png', 'ia-parque', true],
  ['img3.png', 'ia-asado', true],
  ['img4.png', 'ia-cocina', true],
  ['img5.png', 'ia-pileta', true],
  ['img6.png', 'ia-ping-pong', true],
];

mkdirSync(DESTINO, { recursive: true });
let total800 = 0;
let total = 0;

for (const [archivo, nombre, recortar] of FOTOS) {
  const entrada = path.join(ORIGEN, archivo);
  let imagen = sharp(entrada).rotate();
  const { width, height } = await imagen.metadata();
  if (recortar) {
    imagen = imagen.extract({ left: 0, top: 0, width: Math.floor(width * 0.93), height: Math.floor(height * 0.93) });
  }
  const base = await imagen.toBuffer();
  for (const ancho of ANCHOS) {
    const salida = path.join(DESTINO, `${nombre}-${ancho}.webp`);
    const info = await sharp(base)
      .resize({ width: ancho, withoutEnlargement: true })
      .webp({ quality: CALIDAD })
      .toFile(salida);
    const kb = statSync(salida).size / 1024;
    total += kb;
    if (ancho === 800) total800 += kb;
    console.log(`${path.basename(salida).padEnd(28)} ${String(info.width).padStart(4)}x${String(info.height).padEnd(4)} ${kb.toFixed(0)} KB`);
  }
}

console.log(`\nTotal: ${(total / 1024).toFixed(2)} MB (las de 800 px: ${(total800 / 1024).toFixed(2)} MB)`);
