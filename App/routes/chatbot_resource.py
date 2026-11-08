import hashlib
import hmac

import sentry_sdk
from flask import Blueprint, current_app, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.config import ResponseBuilder
from app.extensions import limiter
from app.services.chatbot_service import ChatbotNoDisponible, ChatbotService
from app.utils.turnstile import turnstile_required

ChatbotBP = Blueprint('Chatbot', __name__)

MAX_MESSAGE_LENGTH = 500          # mensaje del usuario
MAX_ASSISTANT_LENGTH = 2000       # respuestas previas del asistente que reenvía el widget
MAX_HISTORIAL = 20                # mensajes por pedido (el widget manda los últimos)
MAX_TOTAL_CARACTERES = 12000
DURACION_SESION = 60 * 60         # la verificación de Turnstile vale 1 hora de chat
MENSAJE_SIN_SERVICIO = "El asistente no está disponible en este momento. Escribinos por WhatsApp al 260 411-9865."


def _serializador():
    # Clave propia derivada de JWT_SECRET_KEY: un token de chat no sirve para nada más
    base = current_app.config['JWT_SECRET_KEY'].encode()
    clave = hmac.new(base, b'chatbot-session', hashlib.sha256).hexdigest()
    return URLSafeTimedSerializer(clave, salt='chatbot-session')


def _validar_historial(data):
    """Devuelve (historial, None) o (None, mensaje de error)."""
    mensajes = data.get("messages") if isinstance(data, dict) else None
    if not isinstance(mensajes, list) or not 1 <= len(mensajes) <= MAX_HISTORIAL:
        return None, f"El historial debe tener entre 1 y {MAX_HISTORIAL} mensajes."

    historial, total = [], 0
    for i, m in enumerate(mensajes):
        if not isinstance(m, dict) or m.get("role") not in ("user", "assistant"):
            return None, "Formato de mensaje inválido."
        contenido = m.get("content")
        if not isinstance(contenido, str) or not contenido.strip():
            return None, "Mensaje no puede estar vacío"
        limite = MAX_MESSAGE_LENGTH if m["role"] == "user" else MAX_ASSISTANT_LENGTH
        if len(contenido) > limite:
            return None, f"El mensaje no puede superar los {MAX_MESSAGE_LENGTH} caracteres"
        esperado = "user" if i % 2 == 0 else "assistant"
        if m["role"] != esperado:
            return None, "Los mensajes deben alternar entre usuario y asistente, empezando por el usuario."
        total += len(contenido)
        historial.append({"role": m["role"], "content": contenido.strip()})

    if historial[-1]["role"] != "user":
        return None, "El último mensaje debe ser del usuario."
    if total > MAX_TOTAL_CARACTERES:
        return None, "La conversación es demasiado larga. Empezá una nueva."
    return historial, None


@ChatbotBP.route('/chatbot/sesion', methods=['POST'])
@limiter.limit("10 per hour")
@turnstile_required
def crear_sesion():
    """Tras pasar Turnstile, entrega un token de sesión de chat válido por una hora."""
    response_builder = ResponseBuilder()
    token = _serializador().dumps({"ok": True})
    return response_builder.add_data({"token": token, "expira_en": DURACION_SESION}).add_status_code(200).build(), 200


@ChatbotBP.route('/chatbot/query', methods=['POST'])
@limiter.limit("10 per minute") # Cada mensaje consume tokens de la API de Claude
@limiter.limit("100 per day")
def handle_query():
    response_builder = ResponseBuilder()

    # Sesión de chat (Turnstile verificado al abrir el chat)
    try:
        _serializador().loads(request.headers.get("X-Chat-Session", ""), max_age=DURACION_SESION)
    except (SignatureExpired, BadSignature):
        return response_builder.add_message("La sesión del chat venció. Verificá de nuevo para continuar.").add_status_code(403).add_data({"codigo": "sesion_chat_invalida"}).build(), 403

    historial, error = _validar_historial(request.get_json(silent=True))
    if error:
        return response_builder.add_message(error).add_status_code(400).build(), 400

    try:
        bot_reply = ChatbotService().responder(historial)
        return response_builder.add_data({"reply": bot_reply}).add_status_code(200).build(), 200
    except ChatbotNoDisponible as e:
        sentry_sdk.capture_exception(e)
        return response_builder.add_message(MENSAJE_SIN_SERVICIO).add_status_code(503).build(), 503
    except Exception as e:
        sentry_sdk.capture_exception(e)
        return response_builder.add_message("Error interno del servidor").add_status_code(500).build(), 500
