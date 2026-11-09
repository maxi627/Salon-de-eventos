# Rediseño del frontend público: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar las páginas públicas del salón con el estilo "Campo cálido", mostrar fechas, precios y seña de forma clara, y que todo funcione bien en el celular, sin tocar el panel de administración ni el backend.

**Architecture:**
- Tokens CSS con el prefijo `--sv-`, más componentes React chicos (`ui/` y `sitio/`) montados dentro de un contenedor `.sitio`, para que nada se filtre al panel.
- Las reglas de fechas y montos viven en funciones puras (`src/lib/`) con pruebas Vitest.
- Para revisar en local sin backend se usa una API simulada en el servidor de desarrollo de Vite, y las capturas se sacan con Playwright sobre el Edge instalado.

**Tech Stack:**
- React 19, Vite 7, React Router 7, TanStack Query 5, react-icons, yet-another-react-lightbox.
- Nuevas: `@fontsource-variable/fraunces`, `@fontsource-variable/inter`.
- Nuevas de desarrollo: `vitest`, `playwright-core`, `sharp`.

**Spec:** `docs/superpowers/specs/2026-11-09-frontend-moderno-design.md`

## Global Constraints

- Todo el trabajo va en la rama `mejora/frontend-moderno`, con un commit por tarea y **sin** línea `Co-Authored-By` en los commits.
- Todos los comandos se corren dentro de `frontend/` salvo que se indique otra cosa. Node 20.19 o más nuevo (hay 22.19).
- Los textos visibles van en español rioplatense (vos): "Elegí", "Reservá", "Ingresá"; nunca "Elige", "Reserva ahora" ni "Selecciona".
- Datos fijos del salón:
  - "Salón de Eventos".
  - Bolívar 1425, San Rafael, Mendoza.
  - WhatsApp `260 411-9865`, enlace `https://wa.me/542604119865`.
  - Lunes a sábado de 11 a 20 hs; domingos no se alquila.
  - Hasta 50 personas.
  - Seña del 30%.
  - Se reserva con hasta 90 días de anticipación.
- Tokens y colores exactamente como en la tabla "Sistema visual" del spec, con el prefijo `--sv-`.
- **Aislamiento del panel:**
  - Ningún CSS nuevo puede tener selectores globales sueltos (`body`, `html`, `*`, `a`, `h1`–`h6`, `button`, `input`, `nav`, `footer`, `main`). Todo cuelga de `.sitio` o de una clase propia con el prefijo `sv-`.
  - No se modifican `App.css`, `AdminPanel.css` ni ningún CSS o componente del panel, salvo para borrar del JSX de `App.jsx` el `nav` y el pie viejos.
- **El pie conserva:**
  - Los enlaces a WhatsApp, Facebook (`https://www.facebook.com/saljjuh/`) e Instagram (`https://www.instagram.com/saloneventos_?igsh=amVocnl5dGdkdXN2`).
  - "Botón de arrepentimiento" (`/arrepentimiento`).
  - "Defensa de las y los Consumidores" (`https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario`), que es obligatorio por ley.
  - "Privacidad" (`/privacidad`).
- **CSP de producción** (`App/traefik/dynamic.yml`): fuentes solo desde `'self'` o cdnjs, e imágenes solo desde `'self' data: blob:`. No se agregan recursos de otros dominios. Font Awesome desde cdnjs sigue disponible, pero en el código nuevo se usa `react-icons`.
- Nada de lo que se envía a la API cambia: mismos endpoints, mismos campos y mismos encabezados (Turnstile incluido).
- Estados que devuelve la API:
  - De una fecha: `disponible`, `pendiente`, `reservada`.
  - De una reserva: `pendiente`, `confirmada`, `cancelada`, `archivada`.
- Los formatos de fecha usan `es-AR`. Los montos se muestran como `$210.000`, con `toLocaleString('es-AR')`, sin decimales.

## Review Focus

1. **Día libre sin precio cargado** (la fecha no está en la base, o `valor_estimado` es `null` o `0`). Hoy se puede reservar, porque `/fecha/by-date` la crea. Se tiene que poder seguir reservando, mostrando "Precio a confirmar". La seña se muestra como "a confirmar por WhatsApp", nunca como `$0`. Lo cubren las pruebas de `estadoDelDia` y `montoSena` (Tarea 2) y los pasos de las Tareas 5 y 6.
2. **Entrar directo a `/reservar/:fecha` con un domingo, una fecha pasada, una a más de 90 días o un texto inválido.** El backend lo aceptaría (permite hasta 2 años). La página tiene que mostrar "Esta fecha no se puede reservar" y un enlace al calendario, sin el paso del contrato. Lo cubre `esReservable` (Tarea 2) y la Tarea 6.
3. **`?fecha=` inválida en `/reservar`** (formato roto, domingo, ocupada o fuera de rango). Se ignora: no queda nada seleccionado y no hay error. Tarea 5.
4. **Sesión vencida o token corrupto al entrar a Mis reservas.** Tiene que ir a `/login?volver=/mis-reservas`, no a un `/login` pelado. Lo cubre `sesionValida` (Tarea 2) y la Tarea 7.
5. **Pantallas de 320 px.** Ninguna página pública desborda. El chequeo de capturas (Tarea 1) corre también a 320 px.

---

### Tarea 1: Herramientas de desarrollo (pruebas, API simulada, capturas)

**Files:**
- Modify: `frontend/package.json` (scripts y dependencias de desarrollo)
- Create: `frontend/vitest.config.js`
- Create: `frontend/dev/mockApi.js`
- Modify: `frontend/vite.config.js`
- Create: `frontend/scripts/capturas.mjs`
- Modify: `.gitignore` (agregar `frontend/.capturas/`)

**Interfaces:**
- Produces:
  - `npm test` (Vitest, entorno `node`, archivos `src/**/*.test.js`).
  - `npm run dev:mock`, que es `vite --mode mock` y sirve la API simulada en `/api/v1`.
  - `node scripts/capturas.mjs <etiqueta> [--url http://localhost:5173]`, que guarda PNG en `frontend/.capturas/<etiqueta>/<ruta>-<ancho>.png` y termina con código 1 si alguna página desborda.

- [ ] **Paso 1: Instalar las dependencias de desarrollo.**
  Correr `npm i -D vitest playwright-core sharp`. Agregar los scripts `"test": "vitest run"` y `"dev:mock": "vite --mode mock"`.
- [ ] **Paso 2: Crear `vitest.config.js`.**
  `test: { environment: 'node', include: ['src/**/*.test.js'] }`.
- [ ] **Paso 3: Crear `dev/mockApi.js` con `export default function mockApi(): import('vite').Plugin`.**
  - El plugin agrega un middleware en `configureServer` que solo responde rutas `/api/v1/*`, con el formato `{ status_code, message, data }`.
  - Los datos se generan relativos a hoy, para que siempre haya fechas futuras.

  | Ruta | Respuesta |
  |------|-----------|
  | `GET /fecha` | ~40 fechas de los próximos 90 días, con todos los estados, precios entre 150000 y 230000, una `disponible` con `valor_estimado: null`, y ningún domingo `disponible`. |
  | `GET /fecha/by-date/:d` | Esa fecha, o una `disponible` sin precio si no existe. |
  | `GET /payment-info` | `{ alias: 'salon.eventos.prueba' }` |
  | `POST /login` | `{ token }`: un JWT sin firma válida (header y payload en base64url) con `role: 'cliente'`, `nombre: 'Laura'` y `exp` dentro de 1 h. Si el correo empieza con `admin`, el rol es `'administrador'`. |
  | `GET /reserva/mis-reservas` | Una `confirmada` con un pago parcial, una `pendiente` y una `cancelada`. |
  | `POST /reserva/solicitar` | 201. |
  | `POST /usuario` (registro), `POST /forgot-password`, `POST /reset-password`, `POST /reservas/arrepentimiento`, `POST /reservas/arrepentimiento/confirmar` | 200 con un mensaje genérico. |
  | Cualquier otra ruta | 404 JSON. |

  En `vite.config.js`, el plugin se carga solo cuando `mode === 'mock'`. En ese modo no hay proxy.
- [ ] **Paso 4: Crear `scripts/capturas.mjs`.**
  - Usa `playwright-core` con `chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' })`, configurable con la variable de entorno `NAVEGADOR`.
  - Rutas: `/`, `/reservar`, `/reservar?fecha=<primera libre>`, `/reservar/<primera libre>`, `/mis-reservas`, `/login`, `/register`, `/forgot-password`, `/arrepentimiento`, `/privacidad` y `/admin-panel`.
  - Para `/reservar/<primera libre>` y `/mis-reservas` primero inicia sesión en el mock con `cliente@prueba.com`. Para `/admin-panel`, con `admin@prueba.com`. El token se guarda en `localStorage.authToken`.
  - Anchos: 320, 390 y 1366. Captura de página completa.
  - Chequeo de desborde: `document.documentElement.scrollWidth > window.innerWidth`. Si desborda, imprime `DESBORDA <ruta> <ancho>`; el chequeo no se aplica a `/admin-panel`.
  - Termina con código 1 si hubo algún desborde.
- [ ] **Paso 5: Sacar la línea de base, antes de cambiar nada.**
  - `VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA npm run dev:mock` en segundo plano.
  - Después, `node scripts/capturas.mjs antes`.
  - Esperado: se generan los PNG. Hoy los desbordes existentes se reportan y el comando sale con código 1; eso es correcto para la línea de base.
- [ ] **Paso 6: Verificar que el build de producción no incluye el mock.**
  Correr `npm run build`, y después `grep -r "salon.eventos.prueba" dist`. Esperado: sin resultados.
- [ ] **Paso 7: Commit.**
  `chore(frontend): pruebas, API simulada y capturas para el rediseño`

### Tarea 2: Reglas de fechas, montos y sesión

**Files:**
- Create: `frontend/src/lib/fechas.js`
- Create: `frontend/src/lib/fechas.test.js`
- Create: `frontend/src/lib/volver.js`
- Create: `frontend/src/lib/volver.test.js`
- Create: `frontend/src/lib/sesion.js`
- Create: `frontend/src/lib/sesion.test.js`

**Interfaces:**
- Produces (fechas siempre como texto `'YYYY-MM-DD'`):
  - `aTextoFecha(date: Date): string` usa los componentes locales, nunca `toISOString`.
  - `hoyLocal(ahora = new Date()): string`
  - `sumarDias(texto: string, n: number): string`
  - `esDomingo(texto: string): boolean`
  - `DIAS_MAXIMOS = 90`
  - `estadoDelDia(texto, infoApi /* {estado, valor_estimado} | undefined */, hoy): 'libre' | 'pendiente' | 'ocupado' | 'domingo' | 'pasado' | 'fuera-de-rango'`
    - Prioridad: pasado > domingo > fuera-de-rango > estado de la API.
    - `'disponible'` o sin dato es `'libre'`, `'pendiente'` es `'pendiente'` y `'reservada'` es `'ocupado'`.
  - `precioDe(infoApi): number | null`: devuelve `null` si falta, si es `null` o si es `<= 0`.
  - `esReservable(texto, infoApi, hoy): boolean`: es `estadoDelDia === 'libre'` y además el texto tiene formato válido. Con un texto inválido devuelve `false` y no lanza error.
  - `montoSena(valor: number | null): number | null`: `Math.round(valor * 0.3)`, o `null` si `valor` es `null`.
  - `proximasFechasLibres(fechas /* array de la API */, hoy, n = 5): Array<{dia, valor_estimado}>`
  - `formatoFechaLarga(texto): string`, por ejemplo `'sábado 14 de noviembre'`.
  - `formatoPesos(n): string`, por ejemplo `'$210.000'`.
  - `volverSeguro(valor: string | null): string | null`, en `volver.js`.
  - `sesionValida(token: string | null, ahora = Date.now()): {role, nombre} | null`, en `sesion.js`: decodifica con `jwt-decode` y devuelve `null` si el token falta, no se puede decodificar o tiene `exp*1000 <= ahora`.

- [ ] **Paso 1: Escribir las pruebas que fallan.**
  Todas usan fechas fijas, nunca el día real.

  `fechas.test.js`:
  - `hoyLocal(new Date(2026, 10, 9, 23, 30))` es `'2026-11-09'`.
  - `esDomingo('2026-11-15')` es `true` y `esDomingo('2026-11-14')` es `false`.
  - Con `hoy = '2026-11-10'` (martes; los días 90 y 91 caen lunes 2027-02-08 y martes 2027-02-09):
    - `estadoDelDia('2026-11-15', undefined, hoy)` es `'domingo'`.
    - `estadoDelDia('2026-11-09', undefined, hoy)` es `'pasado'`.
    - `estadoDelDia('2027-02-08', undefined, hoy)` es `'libre'`.
    - `estadoDelDia('2027-02-09', undefined, hoy)` es `'fuera-de-rango'`.
    - `sumarDias('2026-11-10', 90)` es `'2027-02-08'`.
    - `{estado:'reservada'}` da `'ocupado'` y `{estado:'pendiente'}` da `'pendiente'`.
  - `precioDe({valor_estimado: 0})` es `null` y `precioDe({valor_estimado: 180000})` es `180000`.
  - `montoSena(210000)` es `63000`, `montoSena(155555)` es `46667` y `montoSena(null)` es `null`.
  - `esReservable('2026-13-40', undefined, hoy)` y `esReservable('hola', undefined, hoy)` son `false`.
  - `proximasFechasLibres`, con una lista mezclada:
    - Devuelve primero los viernes y sábados libres con precio, en orden cronológico, y después los demás días libres con precio.
    - Excluye domingos, `pendiente`, `reservada`, días pasados y días sin precio.
    - Respeta `n`.
  - `formatoPesos(210000)` es `'$210.000'`.

  `volver.test.js`:
  - Acepta `'/reservar/2026-11-14'` y `'/mis-reservas'`.
  - Devuelve `null` para `'https://x.com'`, `'//x.com'`, `'/\\x.com'`, `'javascript:alert(1)'`, `''` y `null`.

  `sesion.test.js`, con tokens armados en la prueba (header y payload en base64url, firma `x`):
  - Uno vigente devuelve `{role, nombre}`.
  - Uno con `exp` pasado devuelve `null`.
  - `'basura'` y `null` devuelven `null`.
- [ ] **Paso 2: Correr las pruebas para verificar que fallan.**
  `npm test`. Esperado: FAIL porque los módulos no existen.
- [ ] **Paso 3: Implementar los tres módulos con las firmas de arriba.**
  - Las fechas se parsean como `new Date(y, m-1, d)` (local). Un texto es válido si cumple `/^\d{4}-\d{2}-\d{2}$/` y al volver a formatearlo da el mismo texto.
  - `volverSeguro` acepta solo valores que empiezan con `/`, cuyo segundo carácter no es `/` ni `\`, y que no contienen `:`.
- [ ] **Paso 4: Correr las pruebas.**
  `npm test`. Esperado: PASS.
- [ ] **Paso 5: Commit.**
  `feat(frontend): reglas de fechas, seña y sesión con pruebas`

### Tarea 3: Base visual, encabezado, pie y chat

**Files:**
- Modify: `frontend/package.json` (`@fontsource-variable/fraunces`, `@fontsource-variable/inter`)
- Create: `frontend/src/styles/tokens.css`, `frontend/src/styles/sitio.css`
- Create: `frontend/src/components/ui/Button.jsx`, `Card.jsx`, `Section.jsx`, `Chip.jsx`, `Accordion.jsx`, `ui.css`
- Create: `frontend/src/content/salon.js`
- Create: `frontend/src/components/sitio/SiteHeader.jsx`, `SiteFooter.jsx`, `sitio-layout.css`
- Modify: `frontend/src/App.jsx` (reemplazar el `nav`, el menú móvil y el pie por los componentes nuevos)
- Modify: `frontend/src/main.jsx` (importar las fuentes y `tokens.css`)
- Modify: `frontend/src/components/ChatbotWidget.css` (solo colores)
- Modify: `frontend/index.html` (`lang="es"`, `<title>Salón de Eventos · San Rafael</title>`, `<meta name="description">` y `<meta name="theme-color" content="#B4532A">`)

**Interfaces:**
- Consumes: `sesionValida` (Tarea 2).
- Produces:
  - `<Button variant="primario" | "secundario" | "enlace" as="button" | Link | "a" ...props>`. Todas las variantes miden al menos 44 px de alto.
  - `<Card as? className?>`
  - `<Section id? titulo? bajada? fondo="crema" | "blanco">` (incluye el contenedor de 1040 px de ancho máximo, con 16 px de margen lateral en el celular y 28 px en escritorio).
  - `<Chip>`
  - `<Accordion items={[{pregunta, respuesta}]} />`: usa `<details>`/`<summary>` nativos, para no tener que manejar estado.
  - `salon.js` exporta `SALON = { nombre, direccion, ciudad, whatsappTexto, whatsappUrl, horario, capacidad, redes: {facebook, instagram}, defensaConsumidorUrl, mapaEmbedUrl }`, más `QUE_INCLUYE` (8 ítems `{icono, titulo, detalle}`, donde `icono` es un componente de `react-icons/fa6`), `QUE_LLEVAR = 'La vajilla, el carbón y la música los llevás vos.'`, `PREGUNTAS` y `PASOS_RESERVA`.
  - `mapaEmbedUrl` copia la URL del `iframe` de [home.jsx:128](frontend/src/pages/home.jsx#L128) tal cual.
  - El layout envuelve el `Outlet` en `<div className="sitio">` en las rutas que no son del panel.

- [ ] **Paso 1: Instalar las fuentes y crear los tokens.**
  - `npm i @fontsource-variable/fraunces @fontsource-variable/inter`.
  - `tokens.css` declara en `:root` solo variables `--sv-*`: los colores del spec; `--sv-fuente-titulo: 'Fraunces Variable', Georgia, serif`; `--sv-fuente-texto: 'Inter Variable', system-ui, sans-serif`; los radios `--sv-radio: 16px` y `--sv-radio-chico: 12px`; y `--sv-sombra: 0 6px 20px rgba(80,50,20,.06)`.
  - `sitio.css` define, bajo `.sitio`, el fondo crema, la tipografía, los colores de texto y enlaces, el `box-sizing`, `h1`/`h2` con `clamp()` (h1 `clamp(2rem, 6vw, 3.25rem)`) y el anillo de foco: `outline: 3px solid rgba(180,83,42,.45); outline-offset: 2px`.
- [ ] **Paso 2: Crear los componentes `ui/` y su CSS.**
  Las clases llevan el prefijo `sv-`.
- [ ] **Paso 3: Crear `content/salon.js`.**
  - `PREGUNTAS`, con estas cinco respuestas exactas:
    - **¿Se alquila los domingos?** "No. Los domingos el salón está ocupado todo el año; se alquila de lunes a sábado."
    - **¿Puedo entrar antes a decorar?** "Sí, hasta 2 horas antes del evento, pidiéndolo con anticipación por WhatsApp."
    - **¿Se pueden sumar horas extra?** "Sí, consultando antes por WhatsApp para que no se superpongan con otro turno. La hora extra ronda los $10.000."
    - **¿Qué pasa si cancelo?** "Si cancelás, la seña no se devuelve. Con el botón de arrepentimiento podés cancelar con devolución dentro de los 10 días corridos desde que reservaste, si faltan al menos 7 días para el evento."
    - **¿Qué tengo que llevar?** "Vajilla, utensilios, carbón o leña, insumos de baño (salvo el papel higiénico) y tu equipo de música si querés. El salón pone sillas, mesones, cocina con garrafa, heladera y freezer."
  - `PASOS_RESERVA`, con los cuatro pasos y los textos del boceto:
    - "Elegí la fecha" / "Creá tu cuenta y tocá un día libre."
    - "Aceptá el contrato" / "Lo leés en el sitio antes de seguir."
    - "Pagá la seña" / "Transferís el 30% y subís el comprobante."
    - "Listo" / "Te confirmamos por correo con el contrato."
- [ ] **Paso 4: Crear `SiteHeader`.**
  - Logo de texto: "Salón " + `<span>de</span>` en terracota + " Eventos", como enlace a `/`.
  - Enlaces `/#que-incluye`, `/#fotos`, `/#como-reservar` y `/#ubicacion`.
  - Sin sesión: "Ingresar" (`/login`). Con sesión: "Mis reservas" (`/mis-reservas`), "Salir" y, si `role === 'administrador'`, "Panel" (`/admin-panel`).
  - Botón primario "Reservar" (`/reservar`).
  - Por debajo de 860 px, un botón ☰ con `aria-expanded` y `aria-controls` que abre un panel. El panel se cierra al cambiar de ruta (`useLocation`) y con Escape.
  - Recibe `user` y `onLogout` de `App.jsx`. En `App.jsx`, el estado `user` se inicializa con `sesionValida(localStorage.getItem('authToken'))`, en lugar del `jwtDecode` sin chequear el vencimiento.
- [ ] **Paso 5: Crear `SiteFooter` con todo lo que exige Global Constraints.**
  - Fondo `--sv-tinta`, con texto `#E9E1D6`.
  - El texto de copyright pasa a `© {año} Salón de Eventos`.
- [ ] **Paso 6: Cambiar `App.jsx`.**
  - En rutas que no son del panel, renderiza `SiteHeader`, `<main className="sitio">` con el `Outlet` (se mantiene `context={{ handleLogin }}`), `ChatbotWidget` y `SiteFooter`.
  - En el panel, todo sigue igual que hoy.
  - Se borran del JSX el `nav`, `.mobile-menu` y `.global-footer`. Las reglas de `App.css` no se tocan.
- [ ] **Paso 7: Cambiar los colores del chat en `ChatbotWidget.css`.**
  - Se reemplazan solo los valores de color por `var(--sv-terracota)` y los demás tokens, con un valor de respaldo por si el token falta.
  - Se sube el `bottom` del botón en el celular a 20 px.
  - No se toca ningún tamaño ni posición más.
- [ ] **Paso 8: Verificar el aislamiento.**
  - `grep -nE "^\s*(body|html|\*|a|h[1-6]|button|input|nav|footer|main)\b" src/styles/*.css src/components/ui/*.css src/components/sitio/*.css`. Esperado: sin resultados.
  - Correr `node scripts/capturas.mjs base` y comparar `admin-panel-1366.png` con la línea de base. Esperado: el panel se ve igual.
- [ ] **Paso 9: Correr `npm run lint`, `npm test` y `npm run build`.**
  Esperado: sin errores nuevos.
- [ ] **Paso 10: Commit.**
  `feat(frontend): base visual Campo cálido, encabezado y pie nuevos`

### Tarea 4: Página de inicio

**Files:**
- Create: `frontend/src/hooks/useFechas.js`
- Create: `frontend/src/components/sitio/HeroInicio.jsx`, `ProximasFechas.jsx`, `QueIncluye.jsx`, `GaleriaInicio.jsx`, `ComoReservar.jsx`, `PreguntasUbicacion.jsx`, `inicio.css`
- Create: `frontend/src/content/fotos.js`
- Modify: `frontend/src/pages/home.jsx` (reescritura)
- Delete: `frontend/src/pages/home.css`, `frontend/src/components/PhotoGallery.jsx`, `frontend/src/components/PhotoGallery.css`

**Interfaces:**
- Consumes:
  - `proximasFechasLibres`, `hoyLocal`, `formatoPesos` y `formatoFechaLarga` (Tarea 2).
  - `SALON`, `QUE_INCLUYE`, `QUE_LLEVAR`, `PREGUNTAS` y `PASOS_RESERVA`, más los componentes `ui` (Tarea 3).
- Produces:
  - `useFechas(): { fechas: Array, porDia: Record<string, info>, isLoading, isError, refetch }`, con React Query y la clave `['fechas']`. Hace `fetch('/api/v1/fecha')` sin token y sin el cliente axios, y usa `staleTime: 30_000`. Lo usa también la Tarea 5.
  - `FOTOS: Array<{ src, srcSet?, alt, ancho, alto }>`. En esta tarea apunta a los archivos actuales de `public/`; la Tarea 9 lo cambia por WebP.
  - `FOTO_HERO`: `img5.png` por ahora.
  - Las anclas `id`: `que-incluye`, `fotos`, `como-reservar`, `ubicacion`.

- [ ] **Paso 1: Crear `useFechas` y `content/fotos.js`.**
  - `alt` descriptivos en español: "Pileta del salón con chicos jugando", "Exterior del salón", etc.
  - El orden de `FOTOS` es el de la galería: primero las reales y después las hechas con IA.
- [ ] **Paso 2: Crear `HeroInicio`.**
  - `<section>` con la foto de fondo como `<img>` absoluta (`object-fit: cover`, sin `loading="lazy"`, con `fetchpriority="high"`) y un degradado encima.
  - En escritorio el degradado va hacia la izquierda: `linear-gradient(90deg, rgba(30,20,10,.82), rgba(30,20,10,.15) 70%)`. En el celular va de abajo hacia arriba.
  - Alto: `min(78vh, 640px)` en escritorio y `min(86svh, 620px)` en el celular.
  - Contenido:
    - h1 "Tu evento con parque, pileta y parrilla".
    - Bajada: "Un salón para hasta 50 personas en San Rafael, de lunes a sábado de 11 a 20 hs. Mirá las fechas libres con su precio y reservá online."
    - Botón primario "Ver fechas y precios" (`/reservar`) y secundario "WhatsApp" (`SALON.whatsappUrl`, `target=_blank`, `rel=noopener noreferrer`), en blanco sobre la foto.
    - Etiquetas "Hasta 50 personas", "Pileta en verano", "Parrilla" y "Pool, ping pong y arcade".
- [ ] **Paso 3: Crear `ProximasFechas`.**
  - Título "Próximas fechas libres", bajada "Viernes y sábados primero. Tocá una para reservarla."
  - Cinco tarjetas con el día de la semana, el día y el mes, y el precio.
  - Cada tarjeta es un `Link` a `/reservar?fecha=YYYY-MM-DD`.
  - Mientras carga, cinco tarjetas fantasma.
  - Si hay error o la lista está vacía: "Consultá disponibilidad por WhatsApp" con el botón.
  - Enlace "Ver el calendario completo →".
  - En el celular, la fila se desliza (`overflow-x: auto; scroll-snap-type: x mandatory`), con tarjetas de 140 px de ancho mínimo y sin desbordar la página.
- [ ] **Paso 4: Crear `QueIncluye`.**
  Grilla de cuatro columnas en escritorio y dos en el celular, más la línea `QUE_LLEVAR`.
- [ ] **Paso 5: Crear `GaleriaInicio`.**
  - Grilla de una foto grande y cuatro chicas. La última muestra "Ver las {FOTOS.length} fotos".
  - Cualquier foto abre `Lightbox` en su índice, con `slides={FOTOS}`.
  - Las miniaturas usan `loading="lazy"`.
- [ ] **Paso 6: Crear `ComoReservar` y `PreguntasUbicacion`.**
  - `PreguntasUbicacion` arma dos columnas en escritorio y una en el celular.
  - El `iframe` del mapa usa `loading="lazy"` y `title="Mapa: Bolívar 1425, San Rafael"`.
- [ ] **Paso 7: Reescribir `home.jsx`.**
  - Solo compone las secciones en el orden del spec.
  - Se quitan el carrusel, `MiReserva`, `useMisReservas` y el `jwtDecode`.
  - Se borran `home.css` y `PhotoGallery.*`.
- [ ] **Paso 8: Verificar.**
  - Con `npm run dev:mock` corriendo, correr `node scripts/capturas.mjs inicio` y revisar los PNG de `/` a 320, 390 y 1366.
  - Esperado:
    - Sin `DESBORDA` para `/`.
    - El título y el botón se ven sin scrollear a 390×844.
    - Las fechas del mock aparecen con viernes y sábados primero.
  - `npm run lint` y `npm run build` sin errores.
- [ ] **Paso 9: Commit.**
  `feat(frontend): nueva página de inicio`

### Tarea 5: Calendario de reservas

**Files:**
- Modify: `frontend/src/pages/reservas.jsx` (reescritura)
- Create: `frontend/src/components/sitio/Calendario.jsx`, `ResumenFecha.jsx`, `calendario.css`
- Delete: `frontend/src/pages/reservas.css`

**Interfaces:**
- Consumes: `useFechas` (Tarea 4); `estadoDelDia`, `precioDe`, `montoSena`, `esReservable`, `hoyLocal`, `sumarDias`, `DIAS_MAXIMOS`, `formatoFechaLarga`, `formatoPesos` y `sesionValida` (Tarea 2).
- Produces:
  - `<Calendario porDia hoy seleccionada onSeleccionar(texto) />`.
  - `<ResumenFecha fecha info onReservar />`.

- [ ] **Paso 1: Crear `Calendario`.**
  - Mes visible con flechas, limitado entre el mes actual y el mes de `sumarDias(hoy, DIAS_MAXIMOS)`. La flecha que no se puede usar queda `disabled`.
  - Encabezado "Noviembre 2026": el mes con mayúscula inicial, en `es-AR`.
  - Días como `<button>` con una clase según `estadoDelDia`.
  - Los días libres muestran el precio abreviado (`$150k`) en el celular y completo (`$150.000`) en escritorio, o "Consultar" si no tienen precio.
  - Los días que no son `libre` quedan `disabled` y tienen un `aria-label` con el estado, por ejemplo "domingo 15 de noviembre, no se alquila".
  - Leyenda: Libre, Pendiente, Ocupado, "Domingo (no se alquila)".
  - Mientras carga, la grilla es fantasma. Si hay error: "No pudimos cargar el calendario." con el botón "Reintentar" (`refetch`).
- [ ] **Paso 2: Crear `ResumenFecha`.**
  - Muestra la fecha larga, "Precio estimado" y "Seña para reservar (30%)" con `montoSena`.
  - Si no hay precio, muestra "Precio a confirmar" y "Seña: a confirmar por WhatsApp".
  - Botón "Reservar esta fecha".
  - Al aparecer en el celular hace `scrollIntoView({ block: 'nearest', behavior: 'smooth' })`.
- [ ] **Paso 3: Reescribir `reservas.jsx`.**
  - La fecha seleccionada vive en `useSearchParams` (`fecha`). Al cargar, si `!esReservable(fecha, porDia[fecha], hoy)` se ignora (Review Focus 3), y el mes visible se posiciona en el de la fecha.
  - Tocar un día hace `setSearchParams({ fecha }, { replace: true })`.
  - "Reservar esta fecha": si `sesionValida(...)`, `navigate('/reservar/'+fecha)`; si no, `navigate('/login?volver=' + encodeURIComponent('/reservar/'+fecha))`.
  - Título "Elegí la fecha". Bajada: "De lunes a sábado, hasta 90 días adelante. Los precios son estimaciones base para 50 personas y pueden variar según el tipo de evento y el horario."
  - Se quita el toast de "inicia sesión".
  - Se borra `reservas.css`.
- [ ] **Paso 4: Verificar.**
  - Correr `node scripts/capturas.mjs calendario`. Esperado: sin `DESBORDA` en `/reservar` ni en `/reservar?fecha=...`, y los domingos rayados.
  - Probar a mano en `dev:mock`:
    - `/reservar?fecha=2020-01-01` y `/reservar?fecha=<un domingo>` no seleccionan nada.
    - El día sin precio del mock muestra "Precio a confirmar".
    - Sin sesión, "Reservar esta fecha" lleva a `/login?volver=%2Freservar%2F...`.
- [ ] **Paso 5: Commit.**
  `feat(frontend): calendario con resumen de precio y seña`

### Tarea 6: Contrato, seña y confirmación

**Files:**
- Modify: `frontend/src/pages/confirmacion.jsx` (se reescribe la presentación; `ContractTerms` y las llamadas a la API quedan iguales)
- Create: `frontend/src/components/sitio/Pasos.jsx`, `SubirComprobante.jsx`, `reserva-pasos.css`
- Delete: `frontend/src/pages/confirmacion.css`

**Interfaces:**
- Consumes: `esReservable`, `hoyLocal`, `precioDe`, `montoSena`, `formatoFechaLarga` y `formatoPesos` (Tarea 2); `SALON` y los componentes `ui` (Tarea 3).
- Produces:
  - `<Pasos actual={1|2|3} etiquetas={['Contrato','Seña','Listo']} />`, con `aria-current="step"`.
  - `<SubirComprobante archivo onElegir(file) error />`.

- [ ] **Paso 1: Validar la fecha antes de pedir nada a la API.**
  - Si `!esReservable(dateString, undefined, hoyLocal())` (sin dato de la API solo cuentan el formato, el pasado, el domingo y el rango), se muestra:
    - Título "Esta fecha no se puede reservar".
    - Texto "Puede ser domingo, una fecha pasada o estar a más de 90 días."
    - Un botón "Elegir otra fecha" a `/reservar`.
  - En ese caso no se llama a `/fecha/by-date` (Review Focus 2).
  - Sin sesión válida (`sesionValida`), se navega a `/login?volver=/reservar/<fecha>`.
- [ ] **Paso 2: Rehacer la presentación de los pasos.**
  - **Paso 1:** "Leé y aceptá el contrato". Usa el mismo modal, con `role="dialog"`, `aria-modal` y cierre con Escape. Mismos dos tildes y botón "Continuar al pago".
  - **Paso 2:**
    - "Transferí la seña", con la fecha larga y "precio estimado $X".
    - Tarjeta con "Monto de la seña (30%)" en grande. Sin precio: "Te confirmamos el monto por WhatsApp" y el botón de WhatsApp.
    - Caja del alias con el botón "Copiar" (que pasa a "¡Copiado!" por 2 s).
    - Aviso del titular, con el texto actual en vos.
    - `SubirComprobante`: un `label` grande que envuelve un `input type="file" accept="image/jpeg,image/png,image/webp"`, con vista previa por `URL.createObjectURL`, que se libera al cambiar de archivo o al desmontar. Se mantiene la validación `image/*`.
    - Botones "Enviar comprobante", deshabilitado mientras envía o sin archivo, y "Volver".
  - **Paso 3 "Listo":**
    - Reemplaza `Swal.fire`.
    - Título "¡Listo! Tu fecha quedó pre-reservada". Texto "Vamos a revisar tu comprobante y te va a llegar el contrato por correo cuando confirmemos la reserva."
    - Botones "Ver mis reservas" (`/mis-reservas`) y "WhatsApp".
  - Si falla el envío, el error se muestra arriba de los botones y el archivo se conserva.
- [ ] **Paso 3: Quitar el import de SweetAlert2.**
  Se quita solo de este archivo. La dependencia queda, porque la usa el panel; confirmarlo con `grep -rn sweetalert2 src`.
- [ ] **Paso 4: Verificar.**
  - Correr `node scripts/capturas.mjs sena`.
  - Probar a mano en `dev:mock` el recorrido completo de contrato, seña, envío y Listo, más `/reservar/<un domingo>` y `/reservar/hola`.
  - Esperado: el mensaje de fecha no reservable, sin desbordes, y el monto de la seña igual al 30% del precio del mock.
- [ ] **Paso 5: Commit.**
  `feat(frontend): pasos de contrato y seña con monto exacto`

### Tarea 7: Mis reservas

**Files:**
- Create: `frontend/src/pages/MisReservas.jsx`, `frontend/src/pages/mis-reservas.css`
- Modify: `frontend/src/main.jsx` (ruta `/mis-reservas`)
- Modify: `frontend/src/hooks/useAdminData.js` (solo si hace falta exponer `refetch`; `useMisReservas` se reutiliza tal cual)
- Delete: `frontend/src/components/MiReserva.jsx`, `frontend/src/components/MiReserva.css`

**Interfaces:**
- Consumes: `useMisReservas` (existente; devuelve `{ data: { data: Reserva[] } }` por el interceptor), `sesionValida`, `formatoFechaLarga` y `formatoPesos` (Tarea 2), y `SALON`.

- [ ] **Paso 1: Crear `MisReservas.jsx`.**
  - Si `!sesionValida(token)`, devuelve `<Navigate to="/login?volver=%2Fmis-reservas" replace />` (Review Focus 4).
  - Filtro: futuras y pasadas de hace 15 días o menos, igual que en `MiReserva`, usando `hoyLocal`. Se excluyen las `archivada`.
  - Orden por fecha ascendente.
  - Tarjeta por reserva:
    - Fecha larga.
    - Insignia: `pendiente` es "En revisión" (ámbar), `confirmada` es "Confirmada" (verde) y `cancelada` es "Cancelada" (gris).
    - Solo para las confirmadas:
      - Barra con `pagado / valor_alquiler`, donde `pagado = valor_alquiler - saldo_restante`, acotado entre 0 y el total.
      - "Pagado" y "Saldo $X de $Y".
      - Nota "El saldo lo podés transferir cuando quieras; avisanos por WhatsApp."
      - Botón "Avisar un pago por WhatsApp", que va a `SALON.whatsappUrl` con `?text=` y el mensaje "Hola, quiero avisar un pago de mi reserva del <fecha larga>.".
    - Para las pendientes: "Estamos revisando tu comprobante. Te avisamos por correo cuando se confirme."
  - Saludo "Hola, {nombre}." si el token trae `nombre`.
  - Sin reservas: "Todavía no tenés reservas." con el botón "Ver fechas libres".
  - Mientras carga, tarjetas fantasma. Si hay error: un mensaje con "Reintentar".
- [ ] **Paso 2: Agregar la ruta y limpiar.**
  - Agregar `{ path: "/mis-reservas", element: <MisReservas /> }` en `main.jsx`.
  - Borrar `MiReserva.*`. Confirmar con `grep -rn "MiReserva\b" src` que no quede ningún uso.
- [ ] **Paso 3: Verificar.**
  - Correr `node scripts/capturas.mjs mis-reservas`.
  - Probar a mano: sin sesión, `/mis-reservas` lleva a `/login?volver=%2Fmis-reservas`; con un token vencido puesto a mano en `localStorage`, pasa lo mismo.
- [ ] **Paso 4: Commit.**
  `feat(frontend): página Mis reservas con pagado y saldo`

### Tarea 8: Login, registro y páginas secundarias

**Files:**
- Modify: `frontend/src/pages/login.jsx`, `register.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`, `Arrepentimiento.jsx`, `Privacidad.jsx`
- Create: `frontend/src/components/sitio/TarjetaFormulario.jsx`, `formularios.css`
- Delete: `frontend/src/pages/login.css`, `register.css`, `arrepentimiento.css`, `Privacidad.css`

**Interfaces:**
- Consumes: `volverSeguro` (Tarea 2); `Button` y `Card` (Tarea 3).
- Produces:
  - `<TarjetaFormulario titulo bajada? ancho="angosto" | "ancho">`.
  - Clases `sv-campo`, `sv-campo__label`, `sv-campo__input`, `sv-error`, `sv-exito` y `sv-check` para los formularios.

- [ ] **Paso 1: Crear `TarjetaFormulario` y `formularios.css`.**
  Una tarjeta centrada con 440 px de ancho máximo, o 720 px con `ancho="ancho"` (privacidad y arrepentimiento). Campos de 48 px de alto y errores en terracota oscuro.
- [ ] **Paso 2: Login.**
  - Después del login exitoso: `navigate(volverSeguro(searchParams.get('volver')) ?? '/')`.
  - Textos: título "Ingresá", botón "Ingresar", enlaces "¿Olvidaste tu contraseña?" y "¿No tenés cuenta? Creala".
  - El enlace de registro conserva `?volver=`.
- [ ] **Paso 3: Registro.**
  - DNI con `type="text" inputMode="numeric" pattern="[0-9]*"`.
  - Botón para mostrar u ocultar la contraseña, con `aria-pressed`.
  - Textos en vos.
  - Si hay `volver`, el enlace "Ya tengo cuenta" va a `/login?volver=…`.
  - La lógica, Turnstile y el cuerpo del POST no cambian.
- [ ] **Paso 4: Recuperar y restablecer contraseña, arrepentimiento y privacidad.**
  Se reemplazan solo el marcado de presentación y los textos (pasan a vos). La lógica no cambia. Se borran sus CSS viejos; `ForgotPassword` y `ResetPassword` importaban `login.css`.
- [ ] **Paso 5: Verificar.**
  - Correr `node scripts/capturas.mjs formularios`. Esperado: sin `DESBORDA`.
  - Probar a mano en `dev:mock`:
    - `/login?volver=%2Freservar%2F<fecha>` vuelve a esa fecha al ingresar.
    - `/login?volver=https%3A%2F%2Fx.com` va a `/`.
  - Correr `grep -rniE "inicia sesión|selecciona|olvídate|reserva ahora|ingresa tu" src/pages src/components/sitio`. Esperado: sin resultados.
- [ ] **Paso 6: Commit.**
  `feat(frontend): formularios con el estilo nuevo y vuelta a la fecha tras el login`

### Tarea 9: Fotos optimizadas

**Files:**
- Create: `frontend/scripts/optimizar-fotos.mjs`
- Create: `frontend/public/fotos/*.webp` (generados y commiteados)
- Modify: `frontend/src/content/fotos.js`
- Modify: `frontend/index.html` (`<link rel="preload" as="image" ...>` de la foto del hero, con `imagesrcset`)
- Delete: `frontend/public/img1.png` … `img6.png`, `foto_salon*.jpeg` y `foto_salon*.jpg`

**Interfaces:**
- Produces: `fotos.js` con `src` (800 px), `srcSet` (`/fotos/<nombre>-800.webp 800w, /fotos/<nombre>-1600.webp 1600w`), `alt`, `ancho` y `alto`. `FOTO_HERO` usa la misma forma.

- [ ] **Paso 1: Escribir `optimizar-fotos.mjs` con `sharp`.**
  - Recorre la lista fija de originales de `public/`.
  - Para `img1`–`img6`, primero recorta el 7% derecho e inferior (`extract` con `width*0.93` y `height*0.93`), donde está la ✦.
  - Genera `-800.webp` y `-1600.webp`, con `withoutEnlargement` y `quality: 78`, en `public/fotos/`.
  - Nombres: `exterior`, `exterior-2`, `parrilla`, `parrilla-2`, `parque`, `parque-pileta`, `pileta`, `salon-juegos`, `salon`, `cocina`, `cocina-2`, `bano`, `ia-juegos`, `ia-parque`, `ia-asado`, `ia-cocina`, `ia-pileta`, `ia-ping-pong`, en el orden de [PhotoGallery.jsx](frontend/src/components/PhotoGallery.jsx) seguido de `img1`–`img6`.
  - Imprime el tamaño total generado.
- [ ] **Paso 2: Correr `node scripts/optimizar-fotos.mjs`.**
  Esperado: 36 archivos. Ninguno de 800 px supera los 150 KB, y el total de los de 800 px es menor a 2 MB.
- [ ] **Paso 3: Actualizar el código.**
  - Cambiar `fotos.js` y `FOTO_HERO` (`ia-pileta`) a los WebP.
  - En el hero: `srcSet` y `sizes="100vw"`, más el preload en `index.html`.
  - Borrar los originales de `public/`.
  - Confirmar con `grep -rnE "img[1-6]\.png|foto_salon" src index.html` que no quede ningún uso.
- [ ] **Paso 4: Verificar el peso.**
  - Con `npm run build && npx vite preview --mode mock`, o con `dev:mock`, medir las imágenes que descarga el inicio.
  - Cómo medirlo: agregar a `capturas.mjs` una opción `--peso` que suma `response.body().length` de las respuestas `image/*` al cargar `/` a 390 px sin scrollear.
  - Esperado: menos de 1 MB.
- [ ] **Paso 5: Commit.**
  `perf(frontend): fotos en WebP, sin marca de agua y con tamaños por pantalla`

### Tarea 10: Verificación final y documentación

**Files:**
- Modify: `README.md` (sección Frontend: `npm test`, `npm run dev:mock` y `node scripts/capturas.mjs`)
- Delete: cualquier CSS que haya quedado sin importar (`grep` de cada `*.css` de `src/pages` y `src/components` en los imports)

- [ ] **Paso 1: Borrar el CSS que quedó sin uso.**
  Para cada CSS de `src/`, `grep -rn "<nombre>.css" src`. Si no hay resultados y no es del panel, se borra.
- [ ] **Paso 2: Correr `npm test && npm run lint && npm run build`.**
  Esperado: todo en verde, sin warnings nuevos de lint.
- [ ] **Paso 3: Correr `node scripts/capturas.mjs final`.**
  Esperado: código 0, sin ningún `DESBORDA` a 320, 390 ni 1366. `admin-panel-1366.png` igual al de `antes`.
- [ ] **Paso 4: Hacer el recorrido completo a mano en `dev:mock`.**
  Inicio → tocar una próxima fecha → "Reservar esta fecha" → login → vuelve a la fecha → contrato → seña → envío → Listo → Mis reservas.
- [ ] **Paso 5: Actualizar el README.**
  Agregar los tres comandos, con una línea cada uno.
- [ ] **Paso 6: Commit.**
  `docs: comandos de prueba y revisión del frontend`
- [ ] **Paso 7: Entregar la rama al usuario para revisión en local.**
  - El merge a `main` y el despliegue (`build frontend` y `up -d frontend` en el servidor) se hacen solo después de su "ok, desplegá".
  - Antes del merge, hay que hacer una prueba real contra producción desde el sitio desplegado: el chat, el login con Turnstile real y la subida de un comprobante de prueba que después se borra desde el panel. Para eso se coordina con el usuario.
