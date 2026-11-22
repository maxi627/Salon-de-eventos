# Turnos de día y de noche — diseño

Fecha: 2026-11-22. Rama: `feature/turnos-dia-noche`.

## Para qué

Hoy cada fecha del calendario es una sola unidad: libre, pendiente u ocupada. Si alguien alquila de día,
el cliente ve el día "Ocupado" y no se entera de que la noche sigue libre. En temporada el salón puede
alquilar dos turnos el mismo día. El objetivo es que el calendario muestre **cada turno por separado** y
que el cliente vea que la noche está disponible aunque el día esté tomado.

## Decisiones del dueño

- Dos turnos fijos:
  - **Día**: de 11:00 a 19:00. Hasta ahora era de 11 a 20; cambia en todo el sitio.
  - **Noche**: de 20:30 a 04:30 del día siguiente.
- La noche se muestra **todo el año**.
- La noche **no se reserva online**: el calendario muestra si está libre y deriva a WhatsApp. El día se
  sigue reservando online como hoy. La reserva online de la noche queda para más adelante.
- Las noches se registran como **reservas de verdad** (opción A). El administrador las carga desde
  "Nueva Reserva" en el panel. Tienen pagos, saldo y contrato, y suman en Contabilidad.

## Objetivos

1. El calendario público muestra por día el estado del turno día y el del turno noche.
2. Una fecha con el día ocupado y la noche libre se puede elegir. El resumen ofrece la noche por WhatsApp,
   con un mensaje ya armado.
3. En el panel, cada reserva tiene un turno: día, noche o completo. Un mismo día admite una reserva de día
   y una de noche, o una sola completa.
4. El asistente del chat sabe de los dos turnos: horarios, si la noche está libre y que se pide por
   WhatsApp.

## Fuera de alcance

- Reservar la noche online, con seña y contrato desde el sitio.
- Precio propio de la noche en el calendario. La noche figura "a consultar".
- Ofertas para la noche. Las ofertas siguen siendo del turno día.
- Alquilar los domingos (ver "Decisiones mías").
- Filtrar la lista de Reservas por turno.
- Cambiar el turno de una reserva ya creada. Para cambiarlo, se cancela y se carga de nuevo.

## Lo que no puede pasar

- Que la noche ocupada impida reservar online un día libre, o al revés.
- Que una reserva completa deje libre alguno de los dos turnos.
- Que el sitio muestre libre un turno que está tomado.
- Que alguien reserve la noche desde el sitio manipulando el pedido: el servidor fuerza el turno día en la
  reserva online.
- Que archivar o cancelar una reserva libere un turno que tomó otra reserva de la misma fecha.

## Enfoques considerados

- **A — Turno en la reserva, varias reservas por fecha (elegido).** Cada reserva tiene un turno y la
  fecha guarda el estado de cada turno. Registra las noches con pagos y contabilidad, y deja preparada la
  reserva online de la noche. Es el más trabajoso, porque el sistema asumía una reserva por fecha.
- **B — Marca "noche ocupada" en la fecha.** Simple, pero las noches quedan fuera de Reservas, pagos,
  contratos y Contabilidad. Descartado por eso.
- **C — Deducir el turno de los horarios de la reserva.** Poco confiable: hay reservas sin horario y
  otras que cruzan la medianoche. Descartado.

## Diseño

### Datos

El proyecto no usa migraciones: las columnas nuevas se agregan al arrancar con `COLUMNAS_NUEVAS`, en
`App/db_arranque.py`.

- `reserva.turno`:
  - tipo `VARCHAR(10) NOT NULL DEFAULT 'dia'`, con valores `'dia'`, `'noche'` o `'completo'`;
  - las reservas que ya existen quedan como `'dia'`.
- `fecha.estado`:
  - conserva sus valores, pero pasa a ser **el estado del turno día**;
  - así la reserva online, las ofertas, los precios y "Próximas fechas" siguen funcionando sin cambios.
- `fecha.estado_noche`:
  - nueva columna `VARCHAR(20) NOT NULL DEFAULT 'disponible'`;
  - usa los mismos valores que `estado`: `disponible`, `pendiente` y `reservada`.
- La relación de `Fecha` con `Reserva` pasa de uno a uno (`reserva`, `uselist=False`) a uno a muchos
  (`reservas`). Hoy nadie lee `fecha.reserva`.
- `FechaSchema` expone `estado_noche` (`dump_only`). `ReservaSchema` expone `turno`.
- La noche de una fecha X es la que empieza el X a las 20:30, aunque termine el día siguiente.
- La edición manual de `estado` por `PUT /fecha` del panel queda como está; no se agrega edición manual de `estado_noche`.

### Regla única para el estado de los turnos

Hoy cada operación pisa `fecha.estado` a mano:
- `ReservaService.add`, `update` y `delete`;
- `_cancelar_por_arrepentimiento`;
- la tarea que procesa el comprobante, en `tasks.py`.

Con dos reservas por fecha eso ya no es seguro. Se reemplaza por **una sola función que recalcula** los
dos estados a partir de las reservas activas de esa fecha, es decir, las que no están canceladas ni
archivadas. Para cada turno:

- Si una reserva confirmada cubre el turno, queda `reservada`.
- Si no, pero lo cubre una pendiente, queda `pendiente`.
- Si ninguna lo cubre, queda `disponible`.

Una reserva `dia` cubre el turno día; una `noche`, el turno noche; una `completo`, los dos.

Todas las operaciones de arriba llaman a esta función en lugar de asignar estados. Archivar una reserva
cancelada ya no puede liberar el turno de otra reserva. Ese caso hoy también estaba mal, aun con un solo
turno.

### Alta de reservas

- **Disponibilidad:**
  - una reserva `dia` exige que el turno día esté disponible;
  - una `noche`, que lo esté el turno noche;
  - una `completo`, que lo estén los dos.
  - Se usan los mismos bloqueos que hoy: Redis por fecha y `with_for_update`.
  - El mensaje de error nombra el turno: "El turno noche de esa fecha ya está tomado.".
- **Reserva online** (`/reserva` desde el sitio): el turno se fuerza a `'dia'` en el servidor, sin
  importar lo que mande el cliente.
- **Alta desde el panel** (`/reserva/crear`): acepta `turno`. Un valor que no sea `dia`, `noche` o
  `completo` devuelve un error 400.
- **Horarios por defecto**, cuando la reserva no trae horario:
  - `dia`: de 11:00 a 19:00;
  - `noche`: de 20:30 a 04:30;
  - `completo`: de 11:00 a 04:30.

  El contrato y el mensaje de WhatsApp del panel los muestran según el turno.

### Calendario público

- **Estado de la noche:**
  - `lib/fechas.js` suma `estadoNoche(texto, info, hoy)`, que devuelve `libre`, `pendiente` u `ocupado`
    según `estado_noche`;
  - devuelve `null` en fechas pasadas, domingos y fechas fuera del rango de 90 días;
  - `estadoDelDia` sigue describiendo el turno día.
- **Cada celda:**
  - el turno día se ve como hoy: precio si está libre, etiqueta si está pendiente u ocupado;
  - suma un indicador chico de la noche (luna) que distingue noche libre de noche tomada;
  - se puede elegir si el día **o** la noche están libres;
  - la etiqueta accesible (`etiquetaDelDia`) incluye el estado de la noche.
- **Leyenda:** explica la luna.
- **Resumen de la fecha** elegida (`ResumenFecha`), con dos filas:
  - **Día (11 a 19 hs)**: precio y botón "Reservar" si está libre; "Ocupado" o "Pendiente" si no.
  - **Noche (20:30 a 4:30)**:
    - si está libre, "Libre · precio a consultar" y un botón de WhatsApp con el texto "Hola, quiero
      consultar por el turno noche del <fecha larga>.";
    - si no, "Ocupada".
- **Sin cambios:** "Próximas fechas libres", el banner de ofertas y `esReservable` siguen hablando del
  turno día.
- **Textos con el horario de 11 a 20**: pasan a 11 a 19 y agregan la noche donde corresponda:
  - `SALON.horario`;
  - la bajada del inicio;
  - las preguntas frecuentes;
  - la bajada de `/reservar`.

### Panel de administración

- **Modal de reserva:**
  - al crear, se elige el turno: Día, Noche o Completo;
  - al cambiar el turno, se cargan los horarios por defecto si los campos están vacíos;
  - el aviso de disponibilidad de la fecha elegida se refiere al turno elegido;
  - el precio sugerido se usa solo en el turno día; para noche y completo, el valor del alquiler arranca
    en 0 y lo carga el administrador;
  - en una reserva existente, el turno se muestra sin poder editarse.
- **Lista de Reservas:** una insignia del turno junto a la fecha. Las noches y las completas se destacan.
- **Horario por defecto:** pasa de 20:00 a 19:00 en el modal y en el mensaje de WhatsApp.

### Contrato

- El "Horario Pactado" toma el horario de la reserva y, si no tiene, el del turno.
- Se agrega una fila "Turno".
- El valor por defecto de 11 a 20 desaparece, así que la versión del contrato pasa a 1.3.

### Asistente del chat

- **Herramientas** `consultar_fecha` y `fechas_disponibles`:
  - siguen evaluando el turno día;
  - suman `noche_disponible` (verdadero o falso) para las fechas dentro del rango.
  - `fechas_disponibles` sigue listando los días con el turno día libre.
- **Manual:**
  - turno día de 11 a 19 hs, que se reserva por el sitio;
  - turno noche de 20:30 a 4:30, que se consulta y reserva por WhatsApp y cuyo precio también se
    consulta;
  - si preguntan por una fecha con la noche libre, el asistente lo dice y ofrece el WhatsApp.
- La frase "Turnos de noche: se consultan por WhatsApp" se reemplaza por esas reglas.

### Datos existentes

Al desplegar, con el ok del dueño, se corre un script puntual: la reserva de la administración anterior
del **20/02/2027** (de 11 a 00 hs) pasa a `completo`, y su fecha queda con `estado_noche = 'reservada'`.
Las demás reservas quedan como turno día.

## Pruebas

- **Backend** (pytest, cargando los archivos con `importlib` como los demás tests):
  - la función de recálculo, con combinaciones de reservas de día, noche, completas, pendientes,
    canceladas y archivadas;
  - el alta por turno, con choques de turnos;
  - que la reserva online siempre queda como turno día;
  - que archivar una cancelada no libera el turno de otra reserva;
  - que la herramienta del chat devuelve `noche_disponible`.
- **Frontend** (vitest): `estadoNoche`, la etiqueta accesible con la noche y el texto de WhatsApp del
  turno noche.
- **Capturas** con datos de prueba, a 1366 y 390 px:
  - el calendario con las cuatro combinaciones de día y noche;
  - el resumen;
  - el modal del panel con el selector de turno;
  - la lista de Reservas.

## Decisiones mías (para revisar)

- Los domingos siguen sin alquilarse en los dos turnos: el calendario público no muestra la noche del
  domingo. El panel igual permite cargar una reserva en domingo, como hoy.
- El turno no se edita después de crear la reserva.
- La noche no muestra precio en el sitio ("a consultar"), y en el panel su precio arranca en 0.
- Las reservas de noviembre de la administración anterior (21, 23, 28 y 30) quedan como turno día.
- La versión del contrato pasa a 1.3 por el cambio de horario base.

## Lo que queda a criterio de quien lo construya

- El aspecto exacto del indicador de la noche en la celda. Tiene que leerse bien a 390 px y no tapar el
  precio.
- Los nombres internos de funciones y clases CSS, siguiendo los del proyecto.
