import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SALON } from './salon';
import { SITIO_URL, urlCanonica } from './seo';

const raiz = path.resolve(__dirname, '../..');
const leer = (archivo) => readFileSync(path.join(raiz, archivo), 'utf-8');
const html = leer('index.html');

function datosEstructurados() {
  const bloque = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  expect(bloque, 'index.html debe tener datos estructurados').not.toBeNull();
  return JSON.parse(bloque[1]);
}

function meta(atributo, nombre) {
  const etiqueta = html.match(new RegExp(`<meta ${atributo}="${nombre}" content="([^"]*)"`));
  return etiqueta?.[1];
}

describe('datos estructurados del negocio (index.html)', () => {
  it('coinciden con los datos del salón', () => {
    const datos = datosEstructurados();
    expect(datos['@type']).toEqual(['LocalBusiness', 'EventVenue']);
    expect(datos.name).toBe(SALON.nombre);
    expect(datos.url).toBe(`${SITIO_URL}/`);
    expect(datos.address.streetAddress).toBe(SALON.direccion);
    expect(`${datos.address.addressLocality}, ${datos.address.addressRegion}`).toBe(SALON.ciudad);
    expect(datos.address.addressCountry).toBe('AR');
    expect(datos.telephone).toBe(`+${SALON.whatsappUrl.split('/').pop()}`);
    expect(datos.maximumAttendeeCapacity).toBe(SALON.capacidad);
    expect(datos.sameAs).toEqual([SALON.redes.facebook, SALON.redes.instagram]);
  });

  it('tiene el horario de lunes a sábado de 11 a 20', () => {
    const [horario] = datosEstructurados().openingHoursSpecification;
    expect(horario.dayOfWeek).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
    expect([horario.opens, horario.closes]).toEqual(['11:00', '20:00']);
  });
});

describe('vista previa al compartir (Open Graph)', () => {
  it('tiene título, descripción, url e imagen absoluta que existe', () => {
    expect(meta('property', 'og:title')).toBeTruthy();
    expect(meta('property', 'og:description')).toBe(meta('name', 'description'));
    expect(meta('property', 'og:url')).toBe(`${SITIO_URL}/`);
    const imagen = meta('property', 'og:image');
    expect(imagen.startsWith(`${SITIO_URL}/`)).toBe(true);
    expect(existsSync(path.join(raiz, 'public', imagen.slice(SITIO_URL.length)))).toBe(true);
  });
});

describe('robots.txt y sitemap.xml', () => {
  it('robots.txt permite el sitio e indica el sitemap', () => {
    const robots = leer('public/robots.txt');
    expect(robots).toMatch(/^User-agent: \*$/m);
    expect(robots).not.toMatch(/^Disallow: \/$/m);
    expect(robots).toMatch(new RegExp(`^Sitemap: ${SITIO_URL}/sitemap\\.xml$`, 'm'));
  });

  it('sitemap.xml lista solo las páginas públicas', () => {
    const urls = [...leer('public/sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(urls).toEqual(['/', '/reservar', '/privacidad', '/arrepentimiento'].map((p) => urlCanonica(p)));
  });
});

describe('urlCanonica', () => {
  it('arma la url absoluta del dominio principal', () => {
    expect(urlCanonica('/')).toBe('https://saloneventos.cloud/');
    expect(urlCanonica('/reservar')).toBe('https://saloneventos.cloud/reservar');
  });

  it('saca la barra final, la consulta y el ancla', () => {
    expect(urlCanonica('/reservar/')).toBe('https://saloneventos.cloud/reservar');
    expect(urlCanonica('/reservar?fecha=2026-12-05')).toBe('https://saloneventos.cloud/reservar');
    expect(urlCanonica('/#preguntas')).toBe('https://saloneventos.cloud/');
  });
});
