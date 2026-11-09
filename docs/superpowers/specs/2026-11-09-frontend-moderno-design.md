# Rediseño del frontend público — diseño

Fecha: 2026-11-09 · Rama: `mejora/frontend-moderno` · Estado: aprobado en conversación, pendiente de revisión escrita

## Objetivo

Que quien entra al sitio entienda en segundos qué ofrece el salón, cuánto sale y cómo reservar, y que pueda completar la reserva cómodamente desde el celular.

Criterios de éxito:

- Ninguna página pública tiene scroll horizontal ni contenido cortado a 390 px de ancho.
- Desde el inicio se ven las próximas fechas libres con su precio, sin entrar al calendario.
- El cliente ve el monto exacto de la seña antes de reservar y antes de transferir.
- El inicio descarga menos de 1 MB de imágenes en el celular (hoy, unos 30 MB).
- El panel de administración se ve y funciona exactamente igual que antes.

## Alcance

Incluido (recorrido completo del cliente):

- Inicio, calendario de reservas (`/reservar`), contrato y seña (`/reservar/:fecha`), Mis reservas, login, registro, recuperar y restablecer contraseña, arrepentimiento, privacidad.
- Encabezado, pie, galería y el estilo del botón del chat.

Fuera de alcance:

- Panel de administración (`/admin-panel` y sus componentes).
- Backend: no cambia ningún endpoint. Todo lo nuevo usa datos que la API ya expone.
- Contenido del contrato.

## Decisiones tomadas

| Tema | Decisión |
|------|----------|
| Prioridad | Que más gente consulte y reserve (conversión), con buen aspecto y uso cómodo en el celular. |
| Estilo | "Campo cálido": terracota, verde parque y crema; títulos en serif. |
| Marca | Se mantiene "Salón de Eventos". El logo de imagen se reemplaza por un logo de texto. |
| Imágenes hechas con IA (`img1`–`img6`) | Se mantienen, comprimidas y con la marca ✦ recortada. |
| Parte de arriba del inicio | Una sola foto de fondo, con el texto encima. |
| Botón del chat | Sigue flotando, también en el celular. |
| Implementación | Sistema propio en CSS (tokens + componentes base). Sin Tailwind ni librerías de componentes. |
| Voz | Español rioplatense (vos) en todos los textos. |

## Sistema visual

Tokens en `src/styles/tokens.css`. Todos llevan el prefijo `--sv-` para no chocar con las variables de `App.css`, que usa el panel.

Colores:

| Token | Valor | Uso |
|-------|-------|-----|
| `--sv-terracota` | `#B4532A` | Botones principales, enlaces, acentos |
| `--sv-terracota-osc` | `#93421F` | Hover y texto sobre terracota suave |
| `--sv-terracota-50` | `#F6E9DE` | Etiquetas, día elegido, avisos |
| `--sv-verde` | `#2F5D3A` | "Libre", precios, estados confirmados |
| `--sv-verde-50` | `#E4EEE4` | Fondo de estado confirmado |
| `--sv-crema` | `#FBF6EF` | Fondo de página |
| `--sv-superficie` | `#FFFFFF` | Tarjetas |
| `--sv-borde` | `#EADBC8` | Bordes |
| `--sv-tinta` | `#2E2A24` | Texto principal |
| `--sv-tinta-suave` | `#6B6157` | Texto secundario |
| `--sv-ambar-50` / `--sv-ambar-txt` | `#FBF0D6` / `#8A6212` | Estado pendiente |
| `--sv-gris` | `#EDE8E1` | Ocupado, deshabilitado |

Tipografía:

- Títulos: Fraunces (variable), pesos 600 y 700.
- Texto: Inter (variable), pesos 400, 500 y 600.
- Se instalan con `@fontsource-variable/fraunces` y `@fontsource-variable/inter` y se sirven desde el propio sitio. La CSP (`font-src 'self' https://cdnjs.cloudflare.com`) bloquea Google Fonts.
- Tamaño base de 16 px. Los títulos principales usan `clamp()` para escalar entre celular y escritorio.

Forma:

- Botones redondeados (píldora), de 44 px de alto como mínimo.
- Tarjetas con radio de 16 px, borde `--sv-borde` y una sombra cálida muy suave.
- Foco visible en todos los elementos interactivos: anillo terracota.

Estados de los días del calendario:

| Estado | Aspecto |
|--------|---------|
| Libre | Blanco, borde verde, precio en verde |
| Elegido | Terracota suave, borde terracota |
| Pendiente | Ámbar suave, texto "Pendiente" |
| Ocupado | Gris, texto "Ocupado" |
| Domingo | Rayado gris, texto "No se alquila" |
| Pasado o a más de 90 días | Punteado y apagado |

El rojo desaparece del calendario.

## Arquitectura

Archivos nuevos:

```
src/styles/tokens.css        Tokens --sv-*
src/styles/sitio.css         Base de las páginas públicas, bajo .sitio
src/content/salon.js         Nombre, WhatsApp, dirección, horario, qué incluye, preguntas frecuentes
src/lib/fechas.js            Reglas de fechas y montos (funciones puras)
src/lib/volver.js            Validación del parámetro "volver" del login
src/components/ui/           Button, Card, Section, Container, Chip, Accordion
src/components/sitio/        SiteHeader, SiteFooter, HeroInicio, ProximasFechas,
                             QueIncluye, GaleriaInicio, ComoReservar, Pasos
src/pages/MisReservas.jsx    Página nueva
```

Aislamiento del panel:

- Las páginas públicas se renderizan dentro de un contenedor `.sitio`. Todos los estilos nuevos cuelgan de esa clase o de clases propias de los componentes nuevos.
- `App.jsx` decide qué se muestra. En rutas de cliente, `SiteHeader` y `SiteFooter`; en `/admin-panel`, nada, como hoy.
- El `nav` y el pie que hoy viven en `App.jsx`/`App.css` se reemplazan por los componentes nuevos. Las reglas de `App.css` que use el panel no se tocan.
- Cada página pública reescrita deja de importar su CSS viejo, y ese CSS se elimina cuando ya nadie lo usa. Los CSS del panel no se tocan.

Reglas en `src/lib/fechas.js`, compartidas por el inicio y el calendario:

- `hoyLocal()`: fecha de hoy como `YYYY-MM-DD` en hora local. Reemplaza el uso de `toISOString()`, que después de las 21 h en Argentina devuelve el día siguiente.
- `estadoDelDia(fecha, infoApi, hoy)`: devuelve libre, pendiente, ocupado, domingo, pasado o fuera de rango (más de 90 días).
- `montoSena(valor)`: 30% redondeado a pesos enteros.
- `proximasFechasLibres(fechas, hoy, n = 5)`: fechas libres con precio, primero viernes y sábados, en orden cronológico.

Datos:

- Las fechas salen de `GET /api/v1/fecha`, que ya es pública y está cacheada. El inicio y el calendario la consultan con React Query bajo la misma clave, así se pide una sola vez.
- Mis reservas usa `GET /api/v1/reserva/mis-reservas`, el mismo endpoint que hoy usa el panel flotante, y mantiene el filtro actual (futuras y pasadas de hace menos de 15 días).
- Pagado = `valor_alquiler − saldo_restante`.

## Páginas

### Encabezado y pie

- Encabezado:
  - Logo de texto "Salón de Eventos", con "de" en terracota.
  - Enlaces a las secciones del inicio (Qué incluye, Fotos, Cómo reservar, Ubicación), "Ingresar" y un botón "Reservar".
  - Con sesión iniciada: "Mis reservas" y "Salir". Si el usuario es administrador, además "Panel".
  - En el celular, un menú desplegable (☰) que se cierra al navegar.
- Pie: nombre, dirección, WhatsApp, botón de arrepentimiento y privacidad.
- Se elimina el botón flotante "Mis Reservas" del inicio.

### Inicio

En orden:

1. **Parte de arriba:**
   - Una sola foto de fondo a lo ancho: `img5`, la pileta, comprimida y recortada.
   - El texto va encima, sobre un degradado oscuro: a la izquierda en escritorio, de abajo hacia arriba en el celular.
   - Alto limitado, para que el título y el botón entren sin scrollear.
   - Título "Tu evento con parque, pileta y parrilla".
   - Bajada con capacidad, ciudad y horario: lunes a sábado de 11 a 20 hs.
   - Botones "Ver fechas y precios" y "WhatsApp", y etiquetas (50 personas, pileta en verano, parrilla, juegos).
2. **Próximas fechas libres:**
   - Cinco tarjetas, con viernes y sábados primero, cada una con su precio.
   - Al tocar una se va a `/reservar` con esa fecha ya elegida.
   - Enlace "Ver el calendario completo". En el celular, las tarjetas se deslizan en una fila.
   - Si no hay fechas libres o la API falla, la sección muestra "Consultá disponibilidad por WhatsApp" en lugar de las tarjetas.
3. **Qué incluye:**
   - Ocho tarjetas con íconos de `react-icons`: 50 personas (25 sillas y 4 mesones), cocina completa, parrilla, pileta en verano, parque, juegos, 4 baños (accesible), cocheras.
   - Una línea con lo que lleva el cliente: vajilla, carbón y música.
4. **Fotos:** grilla con una foto grande y cuatro chicas, más "Ver las N fotos", que abre la galería existente (`yet-another-react-lightbox`) con todas las imágenes.
5. **Cómo se reserva:** cuatro pasos (elegí la fecha, aceptá el contrato, pagá la seña, listo).
6. **Preguntas frecuentes y ubicación:**
   - Preguntas desplegables, con el contenido coherente con `App/chatbot/manual_salon.md`: domingos, decorar antes, horas extra, cancelación y arrepentimiento, qué llevar.
   - Al lado, la dirección y el mapa de Google (el `iframe` actual).

### Calendario (`/reservar`)

- Título "Elegí la fecha", con la aclaración de lunes a sábado y hasta 90 días.
- Tarjeta con el mes, flechas y la grilla de días según los estados del sistema visual. La leyenda coincide con lo que se ve.
- Tocar un día libre lo selecciona y muestra un resumen: fecha, precio estimado, seña del 30% y botón "Reservar esta fecha". En el celular, el resumen queda debajo del calendario y se lleva a la vista al seleccionar.
- La fecha elegida se refleja en la URL (`/reservar?fecha=YYYY-MM-DD`), así funciona el enlace desde el inicio y la vuelta después del login.
- "Reservar esta fecha":
  - Con sesión iniciada, va a `/reservar/:fecha`.
  - Sin sesión, va a `/login?volver=/reservar/:fecha`.
- Se mantiene la información de tarifas: los precios son estimaciones base para 50 personas.

### Contrato y seña (`/reservar/:fecha`)

- Indicador de pasos: Contrato → Seña → Listo.
- **Paso Contrato:** igual que hoy (abrir el contrato en un modal, tildar el contrato y la mayoría de edad), con el estilo nuevo.
- **Paso Seña:**
  - Fecha y precio estimado.
  - Monto de la seña en grande, calculado con `montoSena`.
  - Alias o CVU con botón "Copiar".
  - El aviso del titular de la cuenta.
  - Un recuadro grande para subir el comprobante, que muestra el nombre del archivo elegido y una vista previa.
  - Botones "Enviar comprobante" y "Volver".
- **Paso Listo:**
  - Reemplaza al cartel de SweetAlert: la fecha queda pre-reservada.
  - Explica qué sigue: se revisa el comprobante y llega el contrato por correo.
  - Botones "Ver mis reservas" y "WhatsApp".
- No cambia nada de lo que se envía a la API.

### Mis reservas (`/mis-reservas`)

- Ruta nueva. Sin sesión, redirige a `/login?volver=/mis-reservas`.
- Una tarjeta por reserva:
  - Fecha.
  - Estado: "En revisión" (pendiente), "Confirmada" o "Cancelada".
  - Barra de pagado sobre el total, con pagado y saldo.
  - Nota de que el saldo se transfiere cuando quieran avisando por WhatsApp, y el botón "Avisar un pago por WhatsApp".
- Sin reservas: un mensaje y el botón "Ver fechas libres".
- Se elimina el componente `MiReserva` (panel flotante) y su CSS.

### Login, registro y demás

- Login, registro, recuperar y restablecer contraseña, arrepentimiento y privacidad usan la misma tarjeta centrada, los mismos campos, botones y mensajes de error, con textos de vos.
- La lógica, Turnstile y las llamadas a la API no cambian.
- El login, después de entrar, navega al valor de `volver` solo si pasa la validación de `src/lib/volver.js`: tiene que empezar con `/`, no con `//` ni `/\`, y no contener esquema. Si no la pasa, o si no hay `volver`, va al inicio como hoy.
- En el registro, el DNI pasa a `type="text"` con `inputMode="numeric"`, y se agrega mostrar u ocultar la contraseña.

### Chat

- Sigue flotando abajo a la derecha en todas las pantallas.
- Se cambian solo los colores, para que use los tokens (terracota en lugar del color actual).
- Se ajusta el margen inferior para que no tape el pie ni los botones de envío de formularios en el celular.

## Imágenes

- Un script (`frontend/scripts/optimizar-fotos.mjs`, con `sharp` como dependencia de desarrollo) genera versiones WebP en `public/fotos/`, en 800 px y 1600 px de ancho y con calidad de alrededor de 78.
- Para `img1`–`img6` recorta la esquina inferior derecha donde está la ✦.
- Las páginas usan `<img srcset sizes loading="lazy">`. La foto de la parte de arriba no es lazy, tiene `fetchpriority="high"` y se precarga.
- Se eliminan de `public/` los PNG y JPEG originales que ya no se usan. Siguen en el historial de git.
- `logo.png` queda solo como favicon hasta tener un ícono propio. El encabezado ya no lo usa.

## Errores y estados de carga

- Mientras cargan las fechas, el inicio y el calendario muestran tarjetas fantasma con la forma final, en vez de "Cargando...".
- Si la API de fechas falla: en el inicio, el mensaje de WhatsApp; en el calendario, un aviso con "Reintentar".
- En el paso Seña, si falla el envío, el error se muestra arriba del botón y se conserva el archivo elegido.

## Pruebas

- Se agrega Vitest como dependencia de desarrollo, con el script `npm test`. Pruebas unitarias de `src/lib/fechas.js` y `src/lib/volver.js`:
  - Un domingo es "domingo" y no se puede elegir.
  - A las 23:30 hora local, `hoyLocal()` devuelve el día local, no el de UTC.
  - El día 91 queda fuera de rango y el 90 no.
  - `montoSena(210000)` es 63000 y los montos con decimales se redondean a enteros.
  - `proximasFechasLibres` pone viernes y sábados primero, ignora domingos, ocupados, pendientes y fechas sin precio, y devuelve como máximo `n`.
  - `volver` acepta `/reservar/2026-11-14` y rechaza `https://x.com`, `//x.com`, `/\x.com` y `javascript:`.
- Verificación visual: capturas con Edge sin interfaz, a 390 px y 1366 px, de cada página pública y del panel de administración (antes y después). Se revisa que no haya scroll horizontal (`document.documentElement.scrollWidth <= innerWidth`) ni elementos cortados.
- `npm run build` y `npm run lint` sin errores nuevos.
- Recorrido completo a mano antes de desplegar: inicio → fecha → login → contrato → seña → Mis reservas.

## Orden de trabajo y despliegue

Un commit por paso en `mejora/frontend-moderno`:

1. Base: tokens, fuentes, componentes `ui`, `salon.js`, `lib/` con pruebas, encabezado y pie.
2. Inicio.
3. Calendario.
4. Contrato y seña.
5. Mis reservas.
6. Login, registro y demás páginas, y el estilo del chat.
7. Fotos optimizadas y limpieza de CSS y archivos sin uso.

Despliegue:

- Revisión del usuario en local.
- Con su visto bueno, merge a `main`, y luego `git pull`, `build frontend` y `up -d frontend` en el servidor, siempre con el "ok, desplegá" explícito del usuario.
- El backend no se reconstruye. Para volver atrás se revierte el merge y se reconstruye `frontend`.
