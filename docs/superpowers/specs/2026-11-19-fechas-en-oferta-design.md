# Fechas en oferta — diseño

Fecha: 2026-11-19 · Rama: `feat/ofertas`

## Para qué

Cuando una fecha próxima sigue libre, Maximiliano quiere poder bajarle el precio a mano desde el
panel y que el sitio lo muestre de forma llamativa, para alquilarla antes de que pase.

## Objetivos

- Una sección nueva del panel, **"Ofertas"**, para poner en oferta una fecha libre (con su precio
  de oferta) y quitar ofertas activas.
- En el inicio del sitio, un **bloque grande destacado** debajo de la foto principal con la oferta
  más próxima (opción B elegida en los bocetos).
- El precio de oferta es **el precio que vale en todo el sitio** mientras esté activa: calendario,
  próximas fechas, resumen, seña del 30 %, chat y el valor que propone el modal del panel al
  aceptar la reserva. El precio normal se muestra tachado.

## No objetivos

- Historial de ofertas pasadas (el usuario no lo quiere).
- Ofertas automáticas (por ejemplo, "bajar solo si falta poco"): se activan siempre a mano.
- Texto personalizado del banner, porcentajes o promociones sobre varios días a la vez.
- Mostrar el bloque en otras páginas además del inicio.

## Anti-objetivos (sería un fracaso aunque "funcione")

- Que algún lugar muestre un precio distinto al de oferta (banner dice $130.000 y la seña se
  calcula sobre $180.000, o el chat dice otro precio).
- Que se vea una oferta de una fecha que ya no se puede reservar (reservada, pendiente, pasada,
  domingo o fuera de los 90 días).
- Que el panel de administración cambie de aspecto en lo que ya existe.

## Enfoques considerados

| | Enfoque | A favor | En contra |
|---|---|---|---|
| **A (elegido)** | Campo opcional `valor_oferta` en la fecha | Un solo lugar del que sale el precio; nada queda desfasado; simple | Sin historial (no se necesita) |
| B | Tabla aparte de ofertas | Historial, textos por oferta | Todos los lugares que muestran precio consultan dos tablas; más riesgo de desfasajes |
| C | Bajar el precio y marcar "destacada" | Lo más rápido | Se pierde el precio normal (no se puede tachar) y hay que acordarse de volver a subirlo |

El usuario eligió **A**.

## Decisiones del usuario

- Se activa **a mano** desde una sección **"Ofertas"** del panel.
- Aviso en el sitio: **bloque grande solo en el inicio**, debajo de la foto principal (opción B).
- No interesa el registro de ofertas pasadas.
- Aprobó el funcionamiento propuesto (ver "Comportamiento").

## Comportamiento

### Panel → "Ofertas" (pestaña nueva en el menú del panel)

- **Ofertas activas:** fecha, "faltan N días", precio normal tachado, precio de oferta, porcentaje
  de descuento y botón **"Quitar oferta"**.
- **Próximas fechas libres (30 días):** cada fecha reservable que ya existe en el calendario
  (las que nunca se cargaron no tienen precio y no se listan) con su precio actual, un campo
  "precio de oferta" (precio final en pesos), el porcentaje de descuento calculado mientras se
  escribe y el botón **"Poner en oferta"**. Si la fecha es feriado, lleva la etiqueta "Feriado".
- Mensajes de resultado como en el resto del panel; los errores dicen el motivo.

### Reglas

- Solo se puede poner en oferta una fecha **reservable**: estado `disponible`, no domingo, de hoy
  en adelante y dentro de los 90 días (las mismas reglas que el calendario público).
- El precio de oferta es un número **mayor que 0**. Si la fecha tiene precio normal (> 0), la
  oferta tiene que ser **menor** que ese precio.
- Una oferta **deja de mostrarse** cuando la fecha deja de ser reservable (se reserva, queda
  pendiente o pasa). El dato queda guardado en la fecha: si una reserva se cancela y la fecha vuelve
  a estar libre, la oferta reaparece; se quita con "Quitar oferta".
- Cambiar el precio normal de una fecha en oferta **no** quita la oferta. Si el nuevo precio normal
  queda por debajo de la oferta, el sitio usa igual la oferta como precio (el administrador ve la
  situación en "Ofertas" y decide).

### Sitio público

- **Inicio:** si hay al menos una oferta mostrable, debajo de la foto principal aparece el bloque
  terracota "🔥 Fecha en oferta" con la fecha más próxima en oferta, precio de oferta, precio normal
  tachado y el botón "Reservar esta fecha" (lleva a `/reservar?fecha=…`). Si hay más de una, agrega
  "+N ofertas más" que lleva a `/reservar`. Si no hay ninguna, el bloque no existe.
- **Calendario de reservas:** las fechas en oferta muestran el precio de oferta y una marca
  "Oferta"; el resumen de la fecha elegida muestra el precio normal tachado y el de oferta; la seña
  se calcula sobre el precio de oferta. El lector de pantalla anuncia "en oferta".
- **Próximas fechas del inicio:** etiqueta "Oferta" y precio normal tachado.
- **Chat:** responde con el precio de oferta y aclara que la fecha está en oferta (y cuál es el
  precio normal).
- **Confirmación de reserva:** el precio y la seña mostrados son los de oferta.

### Panel → calendario de precios (decisión de diseño, no pedida)

Las celdas de un día en oferta muestran una marca "Oferta" junto al precio, para que al editar
precios se vea que esa fecha tiene una oferta activa. No cambia nada más del editor.

### Panel → modal de reservas

Al aceptar una reserva en $0, el valor que propone es el precio de oferta si la fecha tiene uno
(si no, el precio normal, como hoy). La línea de ayuda lo aclara ("Precio de oferta del
calendario: $X").

## Cómo se construye (decisiones técnicas)

- **Dato:** columna nueva `fecha.valor_oferta` (`Float`, nula = sin oferta). `FechaSchema` la
  incluye. El proyecto no tiene migraciones y `create_all()` no agrega columnas a tablas
  existentes: al arrancar, la API comprueba con el inspector de SQLAlchemy si la columna existe y,
  si falta, la agrega (`ALTER TABLE fecha ADD COLUMN valor_oferta DOUBLE PRECISION`). Idempotente,
  con test (SQLite) — se integra en `app/db_arranque.py`, antes del `dispose()`.
- **API (solo administradores):**
  - `PUT /api/v1/fecha/<id>/oferta` con `{ "valor_oferta": número }` → valida las reglas y guarda.
  - `DELETE /api/v1/fecha/<id>/oferta` → la quita.
  - Ambas invalidan el caché de fechas (`fechas_all` y el del servicio), como hoy `PUT /fecha`.
  - Las reglas de validación viven en una función pura testeable (fecha, estado, precios, hoy).
- **Lectura pública:** `GET /api/v1/fecha` ya devuelve todas las fechas; suma `valor_oferta`. El
  banner y el calendario salen de ese mismo dato (no hace falta otra ruta).
- **Frontend, una sola fuente del precio:** `precioDe(info)` pasa a devolver el precio de oferta
  cuando hay uno válido, y se agrega `precioNormalDe(info)` / `estaEnOferta(info)`. Todos los
  lugares que hoy usan `precioDe` (calendario, resumen, próximas fechas, confirmación, seña)
  quedan con el precio correcto sin lógica propia. Función pura `ofertasVisibles(fechas, hoy)` para
  el banner y el panel, con tests.
- **Chat:** la función que evalúa una fecha (`chatbot_service`) devuelve `precio_estimado_ars` =
  precio de oferta si hay, más `en_oferta: true` y `precio_normal_ars`. `manual_salon.md` suma una
  línea: si la fecha está en oferta, decirlo y mencionar el precio normal.
- **Modal del panel:** `valorAlquilerSugerido` recibe el precio efectivo (oferta si hay).
- **Panel:** componente nuevo `OfertasManager` y pestaña "Ofertas" en `AdminPanel`; estilos nuevos
  en su propio CSS con el lenguaje visual del panel. Lo existente del panel no cambia.
- **Estilo público:** "Campo cálido" (tokens `--sv-*`, prefijo `sv-`), terracota para la oferta.

## Pruebas

- Backend (pytest): columna agregada de forma idempotente; reglas de validación de la oferta
  (domingo, pasada, fuera de rango, no disponible, precio 0, precio ≥ normal, válida); chat
  devuelve precio de oferta y `en_oferta`.
- Frontend (vitest): `precioDe` / `precioNormalDe` / `estaEnOferta`; `ofertasVisibles` (filtra no
  reservables, ordena por fecha); seña sobre el precio de oferta; etiqueta del lector de pantalla.
- Navegador (modo de prueba con el mock): bloque del inicio con 0, 1 y varias ofertas; calendario,
  resumen y confirmación con precio tachado; sección "Ofertas" del panel (poner y quitar) a 320,
  390 y 1366 px, sin desbordes ni errores de consola; el resto del panel igual que antes.
- Docker (API real): agregar la columna sobre una base con datos, poner y quitar ofertas, permisos
  (cliente 403), validaciones y que `GET /fecha` refleje el cambio enseguida.

## Despliegue

Rama `feat/ofertas` → `main` con el "ok" del usuario. Se reconstruyen la API (columna nueva,
rutas y chat) y el frontend; el worker de Celery no cambia. La columna se agrega sola al arrancar
la API.

## Decisiones tomadas por Claude (para revisar)

- El precio de oferta se carga como **precio final** (no porcentaje); el porcentaje se muestra.
- Validación: oferta > 0 y menor que el precio normal cuando este existe.
- La oferta queda guardada si la fecha se reserva y reaparece si la reserva se cancela.
- Cambiar el precio normal no quita la oferta.
- El calendario de precios del panel marca las fechas en oferta.
- En "Ofertas" solo se listan fechas que ya existen en el calendario (con fila en la base).
- La columna nueva se agrega sola al arrancar la API, sin herramienta de migraciones.

## Lo que queda a criterio de quien lo construya

- Textos exactos de los mensajes del panel y microcopias del bloque (siguiendo los bocetos).
- Detalles visuales finos del bloque y de la marca "Oferta" en el calendario, dentro del estilo
  "Campo cálido" y validados con capturas.
- Cómo se apila la sección "Ofertas" en celular (las filas pasan a una columna).
