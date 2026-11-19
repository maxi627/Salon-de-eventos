# Fechas en oferta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el administrador ponga en oferta fechas libres desde una sección "Ofertas" del panel y que el sitio use ese precio en todos lados, con un bloque destacado en el inicio.

**Architecture:** Columna opcional `fecha.valor_oferta` (agregada al arrancar, sin migraciones). Dos rutas de administrador para poner y quitar la oferta, con reglas en una función pura. En el frontend, `precioDe()` pasa a devolver el precio efectivo (oferta si hay), así calendario, resumen, seña y confirmación quedan bien sin lógica propia; el banner y el panel usan `ofertasVisibles()`.

**Tech Stack:** Flask + SQLAlchemy + pytest (backend), React 19 + Vite + vitest + playwright-core (frontend).

**Spec:** `docs/superpowers/specs/2026-11-19-fechas-en-oferta-design.md`

## Global Constraints

- Una oferta es mostrable solo si la fecha es reservable: estado `disponible`, no domingo, de hoy en adelante, dentro de 90 días (`DIAS_MAXIMOS`).
- Precio de oferta > 0 y, si el precio normal > 0, menor que el precio normal.
- Fechas siempre como texto `YYYY-MM-DD` en hora local; nunca `toISOString` (lo vigila `sinFechasUtc.test.js`).
- Sitio público: estilo "Campo cálido" (`--sv-*`, prefijo `sv-`), terracota para la oferta. Panel: lo existente no cambia de aspecto.
- Backend tests: `PYTHONPATH=. App/venv/Scripts/python.exe -m pytest App/tests -q -p no:cacheprovider` (no importar `app.routes` entero: WeasyPrint/GTK no está en Windows; cargar archivos de ruta directamente como en `test_feriado_ruta.py`).
- Archivos nuevos del backend se agregan con `git update-index --add App/...` (diferencia App/app).
- Commits sin trailer Co-Authored-By.

## Review Focus

1. Fecha en oferta que se reserva: deja de verse en banner/tarjetas, pero si se cancela vuelve → `ofertasVisibles` test con estados `pendiente`/`reservada`.
2. Oferta con precio normal en 0 (fecha sin precio cargado): se acepta cualquier oferta > 0 y no se muestra tachado `$0` → tests de `validar_oferta` y de `precioNormalDe`.
3. `valor_oferta` mayor o igual al precio normal tras bajar el precio normal: el sitio igual usa la oferta como precio y no muestra un "descuento" negativo → test de `estaEnOferta`/porcentaje.
4. Base existente sin la columna: el arranque la agrega una vez y no falla en el segundo arranque → test idempotente.
5. Caché: después de poner/quitar la oferta `GET /fecha` la refleja enseguida → verificación en Docker.

---

### Task 1: Dato `valor_oferta` y columna agregada al arrancar

**Files:**
- Modify: `App/models/fecha.py` (columna `valor_oferta = db.Column(db.Float, nullable=True)`)
- Modify: `App/mapping/fecha_schema.py` (`valor_oferta = fields.Float(allow_none=True, dump_only=True)`)
- Modify: `App/db_arranque.py` (nueva `agregar_columnas_faltantes(db)` llamada dentro de `crear_tablas_sin_conexiones_abiertas` antes de `dispose()`)
- Test: `App/tests/test_db_arranque.py`

**Interfaces:**
- Produces: `agregar_columnas_faltantes(db) -> list[str]` (devuelve las columnas que agregó, p. ej. `["fecha.valor_oferta"]`).

- [ ] Test `test_agrega_valor_oferta_a_una_tabla_fecha_vieja`: crear en SQLite una tabla `fecha` sin `valor_oferta` (SQL crudo con `id, dia, estado, valor_estimado, usuario_id`), llamar `agregar_columnas_faltantes(db)` → devuelve `["fecha.valor_oferta"]` y el inspector lista la columna; segunda llamada devuelve `[]`.
- [ ] Test `test_crear_tablas_deja_la_columna_en_tablas_nuevas`: tras `crear_tablas_sin_conexiones_abiertas`, la columna existe y el pool sigue vacío.
- [ ] Correr: FAIL (función inexistente). Implementar con `sqlalchemy.inspect(db.engine).get_columns('fecha')` y `ALTER TABLE fecha ADD COLUMN valor_oferta DOUBLE PRECISION` (en SQLite `REAL`; elegir por `db.engine.dialect.name`). Correr: PASS.
- [ ] Commit `feat(api): columna valor_oferta en fecha, agregada al arrancar`.

### Task 2: Reglas y rutas para poner/quitar la oferta

**Files:**
- Create: `App/ofertas.py` — `validar_oferta(dia: date, estado: str, valor_estimado: float, valor_oferta, hoy: date) -> float` (devuelve el precio validado o lanza `ValueError` con mensaje en castellano).
- Modify: `App/services/fecha_services.py` — `poner_oferta(fecha_id, valor)` y `quitar_oferta(fecha_id)` con el mismo lock y las mismas claves de caché que `update`.
- Modify: `App/routes/fecha_resource.py` — `PUT /fecha/<id>/oferta` y `DELETE /fecha/<id>/oferta`, `@jwt_required() @admin_required()`, exentas del límite para administradores, borran `fechas_all`; 422 con el mensaje de `ValueError`, 404 si no existe.
- Test: `App/tests/test_ofertas.py`

**Interfaces:**
- Consumes: Task 1 (`Fecha.valor_oferta`).
- Produces: `PUT /api/v1/fecha/<id>/oferta` body `{"valor_oferta": number}` → 200 con la fecha; `DELETE /api/v1/fecha/<id>/oferta` → 200.

- [ ] Tests de `validar_oferta` (hoy = 2026-11-19, jueves): válida (sábado 2026-11-28, disponible, normal 180000, oferta 130000 → 130000.0); domingo 2026-11-29 → error; pasada 2026-11-18 → error; a 91 días → error; estado `pendiente`/`reservada` → error; oferta 0, negativa, `None`, texto → error; oferta 180000 con normal 180000 → error; normal 0 y oferta 90000 → 90000.0.
- [ ] FAIL → implementar → PASS. Verificación de rutas en Docker (Task 7).
- [ ] Commit `feat(api): poner y quitar ofertas de fechas`.

### Task 3: El chat informa el precio de oferta

**Files:**
- Modify: `App/services/chatbot_service.py` (la evaluación de una fecha devuelve `precio_estimado_ars` = oferta si es válida, y además `en_oferta: True`, `precio_normal_ars`).
- Modify: `App/chatbot/manual_salon.md` (una línea: si la fecha está en oferta, decirlo y mencionar el precio normal).
- Test: `App/tests/test_chat_oferta.py` (cargar la función por import directo de `app.services.chatbot_service`; si arrastra dependencias no disponibles, extraer `precio_para_chat(fecha_db) -> dict` puro y testear esa).

- [ ] Tests: fecha con oferta → `{"precio_estimado_ars": 130000, "en_oferta": True, "precio_normal_ars": 180000}`; sin oferta → `{"precio_estimado_ars": 180000}` sin `en_oferta`; sin precio → `{"precio_estimado_ars": None}`.
- [ ] FAIL → implementar → PASS → commit `feat(chat): informa las fechas en oferta`.

### Task 4: Precio efectivo y ofertas visibles (lógica del frontend)

**Files:**
- Modify: `frontend/src/lib/fechas.js` — `precioDe(info)` devuelve la oferta si `valor_oferta > 0`, si no el normal; nuevas `precioNormalDe(info)` (normal > 0 o null) y `estaEnOferta(info)` (oferta > 0); `descuentoPorcentaje(info)` (entero, null si no hay normal o si oferta ≥ normal).
- Create: `frontend/src/lib/ofertas.js` — `ofertasVisibles(fechas, hoy) -> fechas[]` reservables con oferta, ordenadas por `dia`.
- Modify: `frontend/src/lib/calendario.js` — `etiquetaDelDia` agrega ", en oferta" cuando corresponde (parámetro opcional `enOferta`).
- Test: `frontend/src/lib/fechas.test.js`, `frontend/src/lib/ofertas.test.js`, `frontend/src/lib/calendario.test.js`

- [ ] Tests: `precioDe({valor_estimado:180000, valor_oferta:130000}) === 130000`; `precioNormalDe(...) === 180000`; `montoSena(precioDe(...)) === 39000`; `descuentoPorcentaje(...) === 28`; oferta ≥ normal → `descuentoPorcentaje` null; `ofertasVisibles` excluye pendiente, reservada, domingo, pasada, > 90 días y sin oferta, y ordena. Etiqueta: `'sábado 28 de noviembre, libre, $130.000, en oferta'`.
- [ ] FAIL → implementar → PASS (suite completa) → commit.

### Task 5: Sitio público (bloque del inicio, calendario, tarjetas, resumen)

**Files:**
- Create: `frontend/src/components/sitio/BannerOferta.jsx` + estilos en `inicio.css` (bloque terracota de los bocetos: "🔥 Fecha en oferta", fecha larga, precio de oferta, normal tachado, botón "Reservar esta fecha" → `/reservar?fecha=…`, "+N ofertas más" → `/reservar`; no renderiza nada si no hay ofertas).
- Modify: `frontend/src/pages/home.jsx` (BannerOferta entre HeroInicio y ProximasFechas).
- Modify: `Calendario.jsx` (marca "Oferta" visible en la celda y clase `sv-dia--oferta`), `ResumenFecha.jsx` y `pages/confirmacion.jsx` (precio normal tachado junto al de oferta), `ProximasFechas.jsx` (etiqueta "Oferta" y tachado).
- Modify: `frontend/dev/mockApi.js` (una fecha libre próxima con `valor_oferta`).

- [ ] Verificación en navegador (modo de prueba) a 320/390/1366: 0, 1 y 3 ofertas; sin desbordes ni errores de consola. Commit.

### Task 6: Panel (sección Ofertas, marca en precios, modal)

**Files:**
- Create: `frontend/src/components/OfertasManager.jsx` + `OfertasManager.css` (boceto `panel-ofertas.html`: ofertas activas con "Quitar oferta"; próximas fechas libres de 30 días con campo de precio, % calculado y "Poner en oferta"; etiqueta "Feriado"; mensajes con motivo).
- Modify: `frontend/src/pages/AdminPanel.jsx` (pestaña `offers`, título "Ofertas").
- Modify: `frontend/src/components/PriceEditor.jsx`/`.css` (marca "Oferta" en la celda).
- Modify: `frontend/src/components/EditReservationModal.jsx` (sugerido = `precioDe(porDia[fecha])`; ayuda "Precio de oferta del calendario: $X" cuando corresponde).
- Modify: `frontend/dev/mockApi.js` (`PUT/DELETE /fecha/:id/oferta`).

- [ ] Verificación en navegador: poner y quitar oferta, validación (precio ≥ normal muestra el error del servidor), modal propone la oferta; capturas del resto del panel iguales a antes. Commit.

### Task 7: Verificación de punta a punta y cierre

- [ ] Docker (entorno descartable): base creada **sin** la columna → arranque la agrega; poner/quitar oferta como admin (200), como cliente (403), reglas (422); `GET /fecha` refleja el cambio al instante; el chat devuelve `en_oferta`.
- [ ] Suites completas backend y frontend, lint de archivos tocados, build.
- [ ] Revisión final de toda la rama.
