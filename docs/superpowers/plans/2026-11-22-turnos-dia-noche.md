# Turnos de día y de noche — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada fecha tenga dos turnos, día (11–19) y noche (20:30–4:30). Las reservas eligen turno, el calendario público muestra la noche, el resumen la deriva a WhatsApp y el asistente la conoce.

**Architecture:**
- Un módulo puro `App/turnos.py` concentra las reglas: turnos, horarios, disponibilidad y el recálculo de los estados de una fecha a partir de sus reservas activas.
- `ReservaService` y la tarea del comprobante dejan de asignar `fecha.estado` a mano y llaman al recálculo.
- En el frontend, `lib/turnos.js` y `lib/fechas.js` dan los datos que usan el calendario, el resumen y el panel.

**Tech Stack:** Flask + SQLAlchemy + Postgres (sin migraciones: `COLUMNAS_NUEVAS`), Celery; React 19 + Vite + React Query, vitest; Playwright (`playwright-core` + Edge) para capturas.

**Spec:** `docs/superpowers/specs/2026-11-22-turnos-dia-noche-design.md`

## Global Constraints

- **Valores de `reserva.turno`:** `'dia'`, `'noche'`, `'completo'`. Por defecto, `'dia'`.
- **Estados por turno:** los de `fecha.estado` (turno día) y `fecha.estado_noche`, que son `'disponible'`, `'pendiente'` y `'reservada'`.
- **Horarios:**
  - día: de 11:00 a 19:00;
  - noche: de 20:30 a 04:30;
  - completo: de 11:00 a 04:30.
- **Turno día solamente:** la reserva online desde el sitio siempre es de turno día. Las ofertas, los precios del calendario, "Próximas fechas" y `esReservable` siguen hablando del turno día.
- **Domingos:** no se alquilan en el sitio, en ninguno de los dos turnos. El panel puede cargar reservas en domingo.
- **Contrato:** pasa a la versión `1.3`.
- **Fechas:** siempre como texto local `YYYY-MM-DD`. Está prohibido `toISOString().slice/split` (lo verifica `sinFechasUtc.test.js`).
- **Tests de backend:**
  - se corren con `PYTHONPATH=. App/venv/Scripts/python.exe -m pytest App/tests -q -p no:cacheprovider`, desde la raíz del repo;
  - los servicios y las rutas se cargan con `importlib.util.spec_from_file_location`, porque importar `app.services` trae WeasyPrint/GTK.
- **Tests de frontend:** `npx vitest run`, desde `frontend/`.
- **Archivos nuevos del backend:** se agregan con `git update-index --add App/...` (la carpeta es `App/` en disco y `app/` en git).
- **Commits:** sin `Co-Authored-By`.
- **Textos del sitio:** en español rioplatense.

## Review Focus

1. Un día con la noche ocupada y el día libre se tiene que poder reservar online. La disponibilidad del turno día no mira `estado_noche`. (Test en la tarea 1.)
2. Archivar una reserva cancelada no libera el turno que tomó otra reserva de la misma fecha. (Test en la tarea 1.)
3. Un `POST /reserva` online con `turno=noche` en el formulario queda como turno día. (Test en la tarea 3 y prueba de punta a punta en la tarea 8.)
4. En los domingos y en las fechas fuera de rango no se muestra la luna y la celda no se puede elegir. (Test en la tarea 5.)
5. Una fecha sin fila en la base (sin `info`) muestra la noche libre, igual que el día. El enlace `/reservar?fecha=` también abre el resumen de una fecha con el día ocupado y la noche libre. (Tests en las tareas 5 y 6.)

---

### Task 1: Reglas de turnos (`App/turnos.py`)

**Files:**
- Create: `App/turnos.py`
- Test: `App/tests/test_turnos.py`

**Interfaces:**
- Produces (todas en `app.turnos`):
  - `TURNOS = ("dia", "noche", "completo")`
  - `HORARIOS: dict[str, tuple[time, time]]`, con los valores de Global Constraints.
  - `normalizar_turno(valor) -> str`: `None` o `''` devuelven `'dia'`; un valor que no esté en `TURNOS` lanza `ValueError("Turno inválido: <valor>")`.
  - `turnos_cubiertos(turno: str) -> frozenset[str]`: `dia` da `{'dia'}`, `noche` da `{'noche'}` y `completo` da `{'dia', 'noche'}`.
  - `estados_de_turnos(reservas) -> tuple[str, str]`: devuelve `(estado_dia, estado_noche)`.
    - `reservas` es una lista de objetos con `.turno` y `.estado`.
    - Ignora las que tienen `estado` en `('cancelada', 'archivada')`. Un `turno` en `None` cuenta como `'dia'`.
    - Por turno: `'reservada'` si alguna confirmada lo cubre; si no, `'pendiente'` si alguna pendiente lo cubre; si no, `'disponible'`.
  - `aplicar_estados(fecha, reservas) -> None`: asigna `fecha.estado` y `fecha.estado_noche` con `estados_de_turnos`.
  - `validar_turno_disponible(estado_dia: str, estado_noche: str, turno: str) -> None`: lanza `ValueError` si algún turno cubierto no está en `'disponible'`. Mensajes:
    - dia: `"El turno día de esa fecha ya está tomado."`
    - noche: `"El turno noche de esa fecha ya está tomado."`
    - completo: `"Esa fecha ya tiene un turno tomado; no se puede reservar completa."`

- [ ] **Step 1: Escribir los tests.** Usar `SimpleNamespace(turno=..., estado=...)` como reserva. Casos:
  - `test_sin_reservas_todo_disponible`: `estados_de_turnos([]) == ('disponible', 'disponible')`.
  - `test_dia_confirmada_y_noche_pendiente`: devuelve `('reservada', 'pendiente')`.
  - `test_completo_cubre_los_dos`: una completa confirmada devuelve `('reservada', 'reservada')`.
  - `test_canceladas_y_archivadas_no_cuentan`: una de día cancelada más una archivada con turno noche devuelven `('disponible', 'disponible')`.
  - `test_archivar_cancelada_no_libera_otra_reserva` (Review Focus 2): una de día cancelada, otra de día confirmada y la cancelada pasada a archivada devuelven `('reservada', 'disponible')`.
  - `test_confirmada_gana_a_pendiente`: dos reservas de día, una pendiente y otra confirmada, dan `'reservada'` en el turno día.
  - `test_turno_nulo_cuenta_como_dia`.
  - `test_validar_dia_ignora_la_noche` (Review Focus 1): `validar_turno_disponible('disponible', 'reservada', 'dia')` no lanza error.
  - `test_validar_mensajes`: los tres mensajes exactos, con `pytest.raises(ValueError, match=...)`.
  - `test_normalizar_turno`: `None` da `'dia'`, `'noche'` da `'noche'`, y `'tarde'` lanza `ValueError`.
  - `test_horarios`: `HORARIOS['noche'] == (time(20, 30), time(4, 30))`.
  - `test_aplicar_estados`: sobre un `SimpleNamespace(estado=None, estado_noche=None)`.
- [ ] **Step 2: Correrlos.** Ejecutar `PYTHONPATH=. App/venv/Scripts/python.exe -m pytest App/tests/test_turnos.py -q -p no:cacheprovider`. Resultado esperado: FAIL (`ModuleNotFoundError: app.turnos`).
- [ ] **Step 3: Implementar `App/turnos.py`** con las interfaces de arriba. No importa nada de Flask.
- [ ] **Step 4: Correrlos de nuevo.** Resultado esperado: todos PASS.
- [ ] **Step 5: Commit.** Ejecutar `git update-index --add App/turnos.py App/tests/test_turnos.py`, después `git commit -m "feat(turnos): reglas de turnos de día y de noche"`.

### Task 2: Columnas y modelos

**Files:**
- Modify:
  - `App/db_arranque.py` (`COLUMNAS_NUEVAS`)
  - `App/models/reserva.py`
  - `App/models/fecha.py`
  - `App/mapping/reserva_schema.py`
  - `App/mapping/fecha_schema.py`
- Test: `App/tests/test_columnas_nuevas.py`

**Interfaces:**
- Produces:
  - Columna `Reserva.turno`: `db.String(10), nullable=False, default='dia', server_default='dia'`.
  - Columna `Fecha.estado_noche`: `db.String(20), nullable=False, default='disponible', server_default='disponible'`.
  - Relación `Fecha.reservas`: `db.relationship('Reserva', back_populates='fecha', lazy='select')`. Es una lista y reemplaza a `Fecha.reserva`.
  - `ReservaSchema.turno`: `fields.Str(validate=validate.OneOf(TURNOS), load_default='dia')`.
  - `FechaSchema.estado_noche`: `fields.Str(dump_only=True)`.
  - Versión por defecto del contrato en `Reserva.version_contrato`: `'1.3'`.
- `COLUMNAS_NUEVAS` suma dos entradas, con el mismo tipo en Postgres y en los otros motores:
  - `("reserva", "turno", "VARCHAR(10) NOT NULL DEFAULT 'dia'", ...)`;
  - `("fecha", "estado_noche", "VARCHAR(20) NOT NULL DEFAULT 'disponible'", ...)`.

- [ ] **Step 1: Escribir el test.** Agregar `test_agrega_turno_y_estado_noche` a `test_columnas_nuevas.py`:
  - crear las tablas viejas `fecha` y `reserva` (sin las columnas nuevas) e insertar una fila en cada una;
  - verificar que `agregar_columnas_faltantes(db)` incluye `"reserva.turno"` y `"fecha.estado_noche"`;
  - verificar que las filas existentes leen `'dia'` y `'disponible'`.
  - Ajustar los tests existentes que comparan la lista exacta de columnas agregadas.
- [ ] **Step 2: Correrlo.** Ejecutar `... -m pytest App/tests/test_columnas_nuevas.py -q -p no:cacheprovider`. Resultado esperado: FAIL.
- [ ] **Step 3: Implementar.** Hacer los cambios de Interfaces en los cinco archivos. Antes de borrar `Fecha.reserva`, buscar `\.reserva\b` en `App/` y confirmar que nadie lo lee.
- [ ] **Step 4: Correr toda la suite del backend.** Resultado esperado: todos PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(turnos): columnas reserva.turno y fecha.estado_noche"`.

### Task 3: Reservas por turno en el backend

**Files:**
- Modify:
  - `App/services/reserva_services.py` (`add`, `update`, `delete`, `_cancelar_por_arrepentimiento`, `marcar_reintegro_pagado`)
  - `App/routes/reserva_resource.py` (`reserva_data` de la reserva online y `/reserva/crear`)
  - `App/tasks.py` (paso 3 del procesamiento del comprobante)
  - `App/templates/contrato.html`
- Test: `App/tests/test_reserva_turnos.py`

**Interfaces:**
- Consumes: todo `app.turnos` (tarea 1) y los campos de la tarea 2.
- Produces:
  - `ReservaService._recalcular_turnos(fecha) -> None`:
    - hace `db.session.flush()`;
    - carga `Reserva.query.filter_by(fecha_id=fecha.id).all()`;
    - llama a `aplicar_estados(fecha, reservas)`.
  - Diccionario `horarios_del_contrato(reserva) -> dict` en `reserva_resource.py`, con las claves:
    - `hora_inicio` y `hora_fin`: el horario de la reserva o el de `HORARIOS[turno]`, como `'HH:MM'`;
    - `turno_nombre`: `'Día'`, `'Noche'` o `'Completo'`.

- [ ] **Step 1: Escribir los tests de las rutas.** `horarios_del_contrato` y el armado de `reserva_data` se prueban cargando `reserva_resource.py` por `importlib`, como `test_feriado_ruta.py`. Si esa carga necesita stubs, extraer las dos funciones puras a `App/turnos.py` y probarlas ahí. Tests:
  - `test_contrato_usa_horario_del_turno_si_no_hay`: una reserva de noche sin horas da `('20:30', '04:30', 'Noche')`.
  - `test_contrato_respeta_horario_cargado`.
  - `test_reserva_online_siempre_es_de_dia` (Review Focus 3): la función que arma los datos de la reserva online, alimentada con un formulario con `turno='noche'`, devuelve `turno == 'dia'`. Para eso, extraer `datos_reserva_online(form, fecha_id, user_id) -> dict` del cuerpo actual de la ruta.
- [ ] **Step 2: Correrlos.** Resultado esperado: FAIL.
- [ ] **Step 3: Cambiar el servicio.**
  - **En `add`:**
    - reemplazar el chequeo `estado != 'disponible'` por `validar_turno_disponible(fecha.estado, fecha.estado_noche, reserva.turno)`;
    - reemplazar la asignación de estado por `db.session.add(reserva)` y después `self._recalcular_turnos(fecha_a_reservar)`.
  - **En `update`:**
    - descartar `updated_data.pop('turno', None)`, porque el turno no se edita;
    - después de asignar los campos, llamar a `_recalcular_turnos(reserva.fecha)` en lugar de las ramas por estado.
  - **En `delete`, `_cancelar_por_arrepentimiento` y `marcar_reintegro_pagado`:** recalcular en lugar de `fecha.estado = 'disponible'`.
- [ ] **Step 4: Cambiar las rutas, la tarea y el contrato.**
  - **Rutas:**
    - la reserva online usa `datos_reserva_online`, con `turno: 'dia'` fijo;
    - `/reserva/crear` pasa `turno` por `normalizar_turno`. Un `ValueError` devuelve 400 con el mensaje.
  - **Tarea:** en `tasks.py`, cambiar `fecha.estado = 'pendiente'` por `aplicar_estados(fecha, Reserva.query.filter_by(fecha_id=fecha.id).all())`.
  - **`_enviar_contrato_confirmacion`:** usa `horarios_del_contrato`.
  - **`contrato.html`:**
    - agrega una fila `<th>Turno:</th><td>{{ turno_nombre }}</td>`;
    - el "Horario Pactado" muestra siempre `de {{ hora_inicio }} a {{ hora_fin }} hs.`;
    - se borra el texto fijo de 11:00 a 20:00.
- [ ] **Step 5: Verificar.** Correr toda la suite del backend (todo PASS). Renderizar `contrato.html` con Jinja como en la verificación anterior y comprobar que muestra `Noche` y `20:30 a 04:30`.
- [ ] **Step 6: Commit.** `git commit -m "feat(turnos): reservas por turno y estados recalculados desde las reservas activas"`.

### Task 4: Asistente del chat

**Files:**
- Modify:
  - `App/services/chatbot_service.py` (`_evaluar_fecha`)
  - `App/chatbot/manual_salon.md`
- Test: `App/tests/test_chat_oferta.py`. Agregar los casos ahí, o en `test_chat_turnos.py` con el mismo cargador.

**Interfaces:**
- Produces: `_evaluar_fecha(dia, fecha_db, hoy)` agrega `noche_disponible: bool` cuando la fecha está dentro del rango y no es domingo, aunque el día no esté disponible. El valor es `fecha_db is None or fecha_db.estado_noche == 'disponible'`.

- [ ] **Step 1: Escribir los tests.**
  - `test_dia_ocupado_noche_libre`: `estado='reservada', estado_noche='disponible'` da `disponible False` y `noche_disponible True`.
  - `test_noche_ocupada`.
  - `test_fecha_sin_fila_tiene_noche_libre`.
  - `test_domingo_no_informa_noche`: la clave `noche_disponible` no aparece.
  - Agregar `estado_noche='disponible'` al helper `_fecha` de los tests existentes.
- [ ] **Step 2: Correrlos.** Resultado esperado: FAIL.
- [ ] **Step 3: Implementar.** Mirar cómo `_evaluar_fecha` resuelve hoy los domingos y el rango, y agregar `noche_disponible` solo en los casos válidos.
- [ ] **Step 4: Actualizar el manual.**
  - **Horario base:** pasa de "de 11:00 a 20:00 hs" a dos turnos: "Turno día: de 11:00 a 19:00 hs" y "Turno noche: de 20:30 a 4:30 hs", de lunes a sábado.
  - **Reglas del turno noche:** reemplazan a "Turnos de noche: se consultan por WhatsApp". El turno noche se consulta y reserva solo por WhatsApp, y su precio también se consulta. Si `noche_disponible` es verdadero, el asistente dice que la noche está libre y ofrece el WhatsApp. Por el sitio se reserva el turno día.
  - **Línea 26:** la lista de "Derivá a WhatsApp" mantiene "turnos de noche".
- [ ] **Step 5: Correr toda la suite.** Resultado esperado: PASS. Después, commit: `git commit -m "feat(chat): el asistente informa el turno noche"`.

### Task 5: Lógica de fechas y turnos en el frontend

**Files:**
- Create:
  - `frontend/src/lib/turnos.js`
  - `frontend/src/lib/turnos.test.js`
- Modify:
  - `frontend/src/lib/fechas.js` (+ `fechas.test.js`)
  - `frontend/src/lib/calendario.js` (+ su test)

**Interfaces:**
- Produces:
  - `TURNOS` en `lib/turnos.js`:
    ```js
    TURNOS = {
      dia:      { nombre: 'Día',      desde: '11:00', hasta: '19:00', texto: '11 a 19 hs' },
      noche:    { nombre: 'Noche',    desde: '20:30', hasta: '04:30', texto: '20:30 a 4:30 hs' },
      completo: { nombre: 'Completo', desde: '11:00', hasta: '04:30', texto: '11 a 4:30 hs' },
    }
    ```
  - `textoWhatsappNoche(dia) -> string`, en `lib/turnos.js`. Devuelve `` `Hola, quiero consultar por el turno noche del ${formatoFechaLarga(dia)}.` ``
  - `estadoNoche(texto, infoApi, hoy) -> 'libre'|'pendiente'|'ocupado'|null`, en `lib/fechas.js`. Devuelve `null` si `estadoDelDia` da `pasado`, `domingo` o `fuera-de-rango`. Si no, mapea `estado_noche` con `ESTADOS_API`, y sin dato da `'libre'`.
  - `esElegible(texto, infoApi, hoy) -> boolean`, en `lib/fechas.js`: el texto es válido y el día o la noche están libres.
  - `etiquetaDelDia(texto, estado, precio, feriado, enOferta = false, noche = null)`, en `lib/calendario.js`. Si `noche` no es `null`, agrega `'noche libre'`, `'noche pendiente'` o `'noche ocupada'`.

- [ ] **Step 1: Escribir los tests.**
  - `estadoNoche`:
    - libre, pendiente y ocupado;
    - sin `info` da `'libre'` (Review Focus 5);
    - un domingo da `null` (Review Focus 4);
    - fuera de rango y pasado dan `null`.
  - `esElegible`:
    - día ocupado y noche libre da `true`;
    - los dos ocupados dan `false`;
    - un domingo da `false`.
  - `etiquetaDelDia`: con `noche='libre'` termina en `', noche libre'`, y sin `noche` queda igual que hoy.
  - `textoWhatsappNoche('2026-12-05') === 'Hola, quiero consultar por el turno noche del sábado 5 de diciembre de 2026.'`. Ajustar la frase a lo que devuelve `formatoFechaLarga`.
- [ ] **Step 2: Correrlos.** Ejecutar `npx vitest run src/lib`. Resultado esperado: FAIL.
- [ ] **Step 3: Implementar** las interfaces de arriba.
- [ ] **Step 4: Correr `npx vitest run`.** Resultado esperado: todo PASS. Después, commit: `git commit -m "feat(turnos): estado de la noche y textos de turnos en el frontend"`.

### Task 6: Calendario público, resumen y textos de horario

**Files:**
- Modify:
  - `frontend/src/components/sitio/Calendario.jsx` y `calendario.css`
  - `frontend/src/components/sitio/ResumenFecha.jsx`
  - `frontend/src/pages/reservas.jsx`
  - `frontend/src/content/salon.js` (`horario` y `PREGUNTAS`)
  - `frontend/src/components/sitio/HeroInicio.jsx`
  - `frontend/index.html` (JSON-LD `openingHoursSpecification`)
  - `frontend/src/content/seo.test.js`

**Interfaces:**
- Consumes: `estadoNoche`, `esElegible`, `TURNOS`, `textoWhatsappNoche`, `whatsappConTexto` (de `content/salon.js`) y `etiquetaDelDia` con `noche`.
- Produces:
  - `ResumenFecha` recibe `{ fecha, info, feriado, hoy, onReservar }`. Necesita `hoy` para calcular los estados.

- [ ] **Step 1: Actualizar `seo.test.js`.** El horario JSON-LD pasa a `['11:00', '04:30']`: abre con el turno día y cierra con el fin del turno noche. Agregar un test en `fechas.test.js` o `reservas`: la fecha pedida por `?fecha=` con el día ocupado y la noche libre se considera seleccionable mediante `esElegible` (Review Focus 5). Correr y verificar que falla.
- [ ] **Step 2: Cambiar el calendario.**
  - **Celda:**
    - `disabled={!esElegible(...)}`;
    - si `estadoNoche` no es `null`, muestra un indicador de la noche con el ícono `FaMoon` de `react-icons/fa6`, con clase `sv-dia__noche` y el modificador `--libre` o `--tomada`;
    - pasa `noche` a `etiquetaDelDia`;
    - el día ocupado con la noche libre conserva la etiqueta "Ocupado" del turno día y queda elegible.
  - **Leyenda:** agrega "🌙 Noche libre (se consulta por WhatsApp)", con el mismo ícono.
  - **Estilo:** a 390 px la luna no tapa el precio corto. Tiene que distinguirse por forma o relleno, no solo por color.
- [ ] **Step 3: Cambiar el resumen.** `ResumenFecha` muestra dos bloques:
  - **Día · 11 a 19 hs:**
    - si está libre, el contenido de hoy (precio, seña y botón "Reservar esta fecha");
    - si está ocupado o pendiente, el texto "Turno día ocupado" o "Turno día pendiente", sin botón.
  - **Noche · 20:30 a 4:30 hs:**
    - si está libre, "Libre · precio a consultar" y un botón de WhatsApp (`FaWhatsapp`) a `whatsappConTexto(textoWhatsappNoche(fecha))`, que abre en otra pestaña;
    - si no, "Turno noche ocupado".

  `reservas.jsx` usa `esElegible` en lugar de `esReservable` para `seleccionada` y le pasa `hoy` al resumen. `confirmacion.jsx` no cambia: sigue exigiendo el día libre.
- [ ] **Step 4: Cambiar los textos.**
  - `SALON.horario`: `'Lunes a sábado · día de 11 a 19 hs y noche de 20:30 a 4:30 hs'`.
  - Bajada del Hero: `"…de lunes a sábado, de día o de noche. Mirá las fechas…"`.
  - `PREGUNTAS`: nueva pregunta "¿Se puede alquilar de noche?", con la respuesta "Sí, el turno noche es de 20:30 a 4:30. En el calendario ves qué noches están libres; se consulta y se reserva por WhatsApp.".
  - `index.html`: `opens` `11:00`, `closes` `04:30`.
- [ ] **Step 5: Verificar.** Correr `npx vitest run` y `npx eslint` sobre los archivos tocados, sin errores nuevos. Después, commit: `git commit -m "feat(sitio): el calendario muestra el turno noche y lo deriva a WhatsApp"`.

### Task 7: Panel de administración

**Files:**
- Modify:
  - `frontend/src/components/EditReservationModal.jsx`
  - `frontend/src/components/ReservasManager.jsx`
  - `frontend/src/components/ReservasManager.css`

**Interfaces:**
- Consumes: `TURNOS` y `estadoNoche`. El modal sigue mandando `fecha_dia` y suma `turno`.

- [ ] **Step 1: Cambiar el modal.**
  - **Al crear:**
    - `formData.turno` arranca en `'dia'`, con un `<select name="turno">` de Día, Noche y Completo;
    - al cambiar de turno, si `hora_inicio` y `hora_fin` están vacías, se cargan con `TURNOS[turno].desde/hasta`.
  - **Disponibilidad:** el aviso de la fecha elegida evalúa el turno elegido. Usa `porDia[fecha].estado` para el día, `estado_noche` para la noche y los dos para completo.
  - **Precio sugerido:** `valorAlquilerSugerido` se aplica solo con turno día; con noche o completo, el valor arranca en 0.
  - **Reserva existente:** el turno se muestra como texto (`TURNOS[reservation.turno ?? 'dia'].nombre`), sin `<select>`.
  - **Textos:**
    - la nota "Si se dejan vacíos…" dice "el contrato usará el horario del turno";
    - el mensaje de WhatsApp usa `TURNOS[turno].desde/hasta` cuando no hay horario cargado (antes, de 11:00 a 20:00).
- [ ] **Step 2: Cambiar la lista de Reservas.** Al lado de la fecha va una insignia `turno-badge turno-badge--<turno>` con `TURNOS[turno].nombre`. Noche y completo se destacan, con un color del tema oscuro del panel.
- [ ] **Step 3: Verificar.** Correr `npx vitest run`, `npx eslint` sobre los archivos tocados y `npx vite build`. Resultado esperado: todo PASS y build ok. Después, commit: `git commit -m "feat(panel): turno en las reservas"`.

### Task 8: Prueba de punta a punta y capturas

**Files:**
- Probes en `frontend/.capturas/` (están en gitignore). Entorno Docker descartable en `scratchpad/carga-local` (proyecto `salon-carga`, `test.env` y `seed.sql`; recrearlos si el scratchpad se borró).

- [ ] **Step 1: Prueba de punta a punta en Docker local.** Levantar el entorno con la rama y comprobar con la API, como admin:
  - crear en una misma fecha una reserva de día confirmada y otra de noche pendiente: `GET /fecha` muestra `estado='reservada'` y `estado_noche='pendiente'`;
  - crear una tercera de noche en esa fecha: da 400 con el mensaje del turno noche;
  - crear una completa en otra fecha: los dos turnos quedan reservados;
  - cancelar la de día, crear otra de día y archivar la cancelada: el turno día sigue reservado (Review Focus 2);
  - una reserva online con `turno=noche` en el formulario queda como `turno='dia'` (Review Focus 3).

  Bajar el entorno al terminar.
- [ ] **Step 2: Capturas en modo mock**, a 1366 y 390 px, interceptando `/api/v1/fecha` con estas combinaciones:
  - día libre con noche libre;
  - día ocupado con noche libre;
  - día libre con noche ocupada;
  - completo;
  - domingo.

  Revisar el calendario, el resumen de "día ocupado con noche libre" (el botón de WhatsApp lleva el texto correcto), el modal del panel con el selector de turno y la lista con las insignias. Además: sin errores de página y sin scroll horizontal a 390 px.
- [ ] **Step 3: Correr las dos suites completas** (backend y frontend). Ledger con los resultados.

### Task 9: Script de datos para el despliegue

**Files:**
- Create: `scratchpad/marcar_turno_completo.py` (fuera del repo; patrón de `cargar_reservas_anteriores.py`).

- [ ] **Step 1: Escribir el script.**
  - Busca la reserva de `administracion.anterior@saloneventos.cloud` del `2027-02-20`.
  - Le pone `turno = 'completo'` y recalcula los estados de la fecha con `aplicar_estados`.
  - Tiene `--prueba` para correrlo sin guardar e imprime el antes y el después.
  - Es idempotente.
- [ ] **Step 2: No se corre hasta el despliegue,** y solo con el ok del dueño. Primero en modo `--prueba`.

## Despliegue (después de la revisión final y con el ok del dueño)

Unir la rama a `main` y hacer push. En el servidor:
1. `git pull`.
2. `build` y `up -d` de `app`, `worker` y `frontend`. Las columnas se agregan al arrancar.
3. Verificar que la API no da errores, que `GET /api/v1/fecha` devuelve `estado_noche` y que el bundle trae los textos nuevos.
4. Correr el script de la tarea 9: primero `--prueba`, después de verdad.
