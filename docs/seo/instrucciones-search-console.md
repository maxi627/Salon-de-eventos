# Instrucciones: dar de alta saloneventos.cloud en Google Search Console

Estas instrucciones son para una sesión de Claude con acceso al navegador de Maximiliano.
Objetivo: que Google conozca el sitio https://saloneventos.cloud y empiece a mostrarlo en las búsquedas.

## Contexto

- Sitio: https://saloneventos.cloud (salón de eventos en San Rafael, Mendoza). `www.saloneventos.cloud`
  redirige al dominio principal sin `www`.
- El DNS del dominio está en **Cloudflare**.
- El sitio ya publica `https://saloneventos.cloud/robots.txt` y `https://saloneventos.cloud/sitemap.xml`.
- Maximiliano ya tiene una cuenta de Google; la sesión la inicia él.

## Reglas

1. **No escribas contraseñas ni códigos de verificación.** Si Google o Cloudflare piden iniciar sesión, o una
   verificación en dos pasos, pedile a Maximiliano que lo haga él y esperá a que te avise.
2. **En Cloudflare, solo agregá el registro TXT de verificación de Google.** No modifiques, borres ni
   desactives ningún otro registro DNS ni ninguna otra configuración (proxy, SSL, reglas, firewall, etc.).
3. **Antes de guardar el registro DNS, mostrale a Maximiliano lo que vas a agregar** (tipo, nombre y valor) y
   esperá su confirmación.
4. Si algo no coincide con lo que dicen estas instrucciones (por ejemplo, la propiedad ya existe, o la
   pantalla es distinta), describí lo que ves y preguntá antes de seguir.
5. No aceptes ofertas de servicios pagos ni cambies la configuración de la cuenta de Google.

## Pasos

### 0. Comprobar que el sitio está listo

Abrí https://saloneventos.cloud/sitemap.xml. Tiene que mostrarse un XML con 4 direcciones (`/`, `/reservar`,
`/privacidad`, `/arrepentimiento`). Si en lugar de eso aparece la página de inicio del salón, detenete y
avisale a Maximiliano: todavía no está desplegada la versión que incluye el sitemap.

### 1. Crear la propiedad en Search Console

1. Abrí https://search.google.com/search-console. Si no hay sesión iniciada, pedile a Maximiliano que entre
   con su cuenta.
2. Agregá una propiedad nueva de tipo **Dominio** (no "Prefijo de URL") con el valor `saloneventos.cloud`
   (sin `https://` ni `www`). Así quedan cubiertas todas las variantes del sitio.
3. Si la propiedad ya existe y está verificada, salteá al paso 3.

### 2. Verificar que el dominio es de Maximiliano

Google va a pedir un registro DNS de tipo TXT. Hay dos formas; usá la que ofrezca la pantalla:

- **Automática con Cloudflare** (si Google muestra la opción de verificar con Cloudflare): seguí el asistente.
  Cuando Cloudflare pida autorizar el cambio, mostrale a Maximiliano qué registro va a crear y esperá su "ok".
- **Manual:** copiá el valor que da Google (empieza con `google-site-verification=`). En otra pestaña abrí
  https://dash.cloudflare.com, entrá al dominio `saloneventos.cloud` → **DNS** → **Records** →
  **Add record** y cargá:
  - Type: `TXT`
  - Name: `@`
  - Content: el valor copiado de Google
  - TTL: `Auto`

  Mostrale los datos a Maximiliano, guardá con su confirmación, volvé a Search Console y tocá **Verificar**.
  Si dice que todavía no encuentra el registro, esperá un par de minutos y reintentá (a veces tarda).

### 3. Enviar el sitemap

En la propiedad `saloneventos.cloud`, menú **Sitemaps** → en "Agregar un sitemap nuevo" escribí la dirección
completa `https://saloneventos.cloud/sitemap.xml` → **Enviar**. Anotá el estado que muestra (puede decir
"Correcto" o quedar pendiente un rato; las dos cosas están bien).

### 4. Pedir que indexe las páginas principales

Usá la barra **Inspeccionar cualquier URL** de arriba con cada una de estas direcciones y, en cada una, tocá
**Solicitar indexación**:

1. `https://saloneventos.cloud/`
2. `https://saloneventos.cloud/reservar`

Si dice "La URL no está en Google", es lo esperado en un sitio nuevo: igual solicitá la indexación. Si aparece
un error (por ejemplo, bloqueada por robots.txt o error del servidor), copiá el mensaje exacto.

### 5. Informe final para Maximiliano

Contale, en pocas líneas:

- si la propiedad quedó verificada y con qué método;
- qué registro DNS se agregó en Cloudflare (tipo y nombre; el valor no hace falta repetirlo);
- el estado del sitemap;
- en qué páginas se solicitó la indexación y qué respondió Google;
- cualquier error o advertencia que haya aparecido.

Recordale que Google suele tardar entre unos días y un par de semanas en mostrar el sitio, y que en
Search Console → **Páginas** va a poder ver cuándo quedan indexadas.
