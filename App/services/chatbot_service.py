import json
import os
from datetime import date, datetime, timedelta
from pathlib import Path

import anthropic
import pytz
import sentry_sdk

from app.models import Fecha

MODELO = os.getenv("CHATBOT_MODEL", "claude-haiku-5-5")
ZONA_HORARIA = pytz.timezone("America/Argentina/Buenos_Aires")
DIAS_MAXIMOS_ANTICIPACION = 90  # mismas reglas que el calendario de reservas
MAX_ITERACIONES = 4  # tope de vueltas modelo -> herramienta por mensaje (chat público)

MENSAJE_NO_DISPONIBLE = (
    "En este momento no puedo responder. Escribinos por WhatsApp al 260 411-9865 y te atendemos."
)

# El manual se lee una vez: es el prefijo estable que queda en la caché de prompts
MANUAL = (Path(__file__).resolve().parent.parent / "chatbot" / "manual_salon.md").read_text(encoding="utf-8")

DIAS_SEMANA = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]

HERRAMIENTAS = [
    {
        "name": "consultar_fecha",
        "description": (
            "Devuelve si una fecha está disponible para alquilar el salón y su precio estimado. "
            "Usala cada vez que pregunten por una fecha concreta."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "fecha": {"type": "string", "description": "Fecha en formato AAAA-MM-DD."},
            },
            "required": ["fecha"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "name": "fechas_disponibles",
        "description": (
            "Lista las fechas disponibles (con precio estimado si está cargado) de un mes. "
            "Usala para sugerir fechas cuando pregunten qué hay libre en un mes."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "mes": {"type": "string", "description": "Mes en formato AAAA-MM."},
            },
            "required": ["mes"],
            "additionalProperties": False,
        },
        "strict": True,
    },
]


def _opciones_fallback(modelo: str) -> dict:
    # Haiku no tiene fallback del lado del servidor: no se le manda el parámetro
    if modelo.startswith("claude-haiku"):
        return {}
    return {"betas": ["server-side-fallback-2026-07-01"], "fallbacks": "default"}


class ChatbotNoDisponible(Exception):
    """El asistente no está configurado o la API no respondió."""


def _hoy() -> date:
    return datetime.now(ZONA_HORARIA).date()


def _evaluar_fecha(dia: date, fecha_db, hoy: date) -> dict:
    """Aplica las reglas del calendario del sitio. No expone datos de clientes."""
    resultado = {"fecha": dia.isoformat(), "dia_semana": DIAS_SEMANA[dia.weekday()]}
    if dia < hoy:
        return {**resultado, "disponible": False, "motivo": "La fecha ya pasó."}
    if dia > hoy + timedelta(days=DIAS_MAXIMOS_ANTICIPACION):
        return {**resultado, "disponible": False,
                "motivo": f"Sólo se reserva con hasta {DIAS_MAXIMOS_ANTICIPACION} días de anticipación."}
    if dia.weekday() == 6:
        return {**resultado, "disponible": False, "motivo": "Los domingos el salón no se alquila."}
    if fecha_db is not None and fecha_db.estado != "disponible":
        return {**resultado, "disponible": False, "motivo": "La fecha ya está reservada o tiene una reserva en curso."}
    precio = fecha_db.valor_estimado if fecha_db is not None and fecha_db.valor_estimado > 0 else None
    return {**resultado, "disponible": True, "precio_estimado_ars": precio}


def consultar_fecha(fecha: str) -> dict:
    dia = datetime.strptime(fecha, "%Y-%m-%d").date()
    fecha_db = Fecha.query.filter_by(dia=dia).first()
    return _evaluar_fecha(dia, fecha_db, _hoy())


def fechas_disponibles(mes: str) -> dict:
    inicio = datetime.strptime(mes, "%Y-%m").date()
    fin = (inicio.replace(day=28) + timedelta(days=4)).replace(day=1)  # primer día del mes siguiente
    hoy = _hoy()
    filas = {f.dia: f for f in Fecha.query.filter(Fecha.dia >= inicio, Fecha.dia < fin).all()}

    disponibles = []
    dia = inicio
    while dia < fin:
        evaluacion = _evaluar_fecha(dia, filas.get(dia), hoy)
        if evaluacion["disponible"]:
            disponibles.append(evaluacion)
        dia += timedelta(days=1)

    respuesta = {"mes": mes, "fechas_disponibles": disponibles}
    if not disponibles:
        respuesta["nota"] = (
            "No hay fechas disponibles en ese mes (puede estar fuera del plazo de "
            f"{DIAS_MAXIMOS_ANTICIPACION} días o ya pasó)."
        )
    return respuesta


FUNCIONES = {"consultar_fecha": consultar_fecha, "fechas_disponibles": fechas_disponibles}


def _ejecutar_herramienta(bloque) -> dict:
    funcion = FUNCIONES.get(bloque.name)
    if funcion is None:
        return {"type": "tool_result", "tool_use_id": bloque.id, "is_error": True,
                "content": f"Herramienta desconocida: {bloque.name}"}
    try:
        resultado = funcion(**bloque.input)
        return {"type": "tool_result", "tool_use_id": bloque.id,
                "content": json.dumps(resultado, ensure_ascii=False)}
    except (ValueError, TypeError) as e:
        # Fecha mal formada u otro argumento inválido: el modelo puede corregirlo
        return {"type": "tool_result", "tool_use_id": bloque.id, "is_error": True,
                "content": f"Argumento inválido: {e}. Usá AAAA-MM-DD para fechas y AAAA-MM para meses."}


class ChatbotService:
    def __init__(self, client=None):
        # El cliente se puede inyectar (tests); si no, se crea con ANTHROPIC_API_KEY
        self.client = client

    def _cliente(self):
        if self.client is None:
            if not os.getenv("ANTHROPIC_API_KEY"):
                raise ChatbotNoDisponible("ANTHROPIC_API_KEY no está configurada")
            self.client = anthropic.Anthropic(timeout=30.0, max_retries=2)
        return self.client

    def _system(self) -> list:
        hoy = _hoy()
        return [
            # Prefijo estable (herramientas + manual) en caché; la fecha va después para no invalidarla
            {"type": "text", "text": MANUAL, "cache_control": {"type": "ephemeral"}},
            {"type": "text", "text": f"Fecha de hoy en San Rafael: {DIAS_SEMANA[hoy.weekday()]} {hoy:%d/%m/%Y}."},
        ]

    def responder(self, historial: list) -> str:
        """
        historial: lista validada de {"role": "user"|"assistant", "content": str},
        que empieza y termina con un mensaje del usuario.
        """
        cliente = self._cliente()
        messages = [{"role": m["role"], "content": m["content"]} for m in historial]
        system = self._system()

        try:
            for _ in range(MAX_ITERACIONES):
                respuesta = cliente.beta.messages.create(
                    model=MODELO,
                    max_tokens=2048,
                    system=system,
                    tools=HERRAMIENTAS,
                    messages=messages,
                    output_config={"effort": "low"},
                    **_opciones_fallback(MODELO),
                )

                if respuesta.stop_reason == "refusal":
                    return ("No puedo ayudarte con eso. Si tenés una consulta sobre el salón, "
                            "escribinos por WhatsApp al 260 411-9865.")

                if respuesta.stop_reason in ("tool_use", "pause_turn"):
                    # Se devuelve el turno completo (incluidos bloques de razonamiento) sin modificar
                    messages.append({"role": "assistant", "content": respuesta.content})
                    if respuesta.stop_reason == "tool_use":
                        resultados = [_ejecutar_herramienta(b) for b in respuesta.content if b.type == "tool_use"]
                        messages.append({"role": "user", "content": resultados})
                    continue

                texto = "\n".join(b.text for b in respuesta.content if b.type == "text").strip()
                return texto or MENSAJE_NO_DISPONIBLE

            return MENSAJE_NO_DISPONIBLE

        except anthropic.APIConnectionError as e:
            sentry_sdk.capture_exception(e)
            raise ChatbotNoDisponible("No se pudo conectar con la API") from e
        except anthropic.APIStatusError as e:
            sentry_sdk.capture_exception(e)
            raise ChatbotNoDisponible(f"La API respondió {e.status_code}") from e
