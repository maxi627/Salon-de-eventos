import sentry_sdk
from flask import Blueprint, request

from app.config import ResponseBuilder
from app.extensions import limiter
from app.services.chatbot_service import ChatbotService

ChatbotBP = Blueprint('Chatbot', __name__)

MAX_MESSAGE_LENGTH = 500


@ChatbotBP.route('/chatbot/query', methods=['POST'])
@limiter.limit("10 per minute") # Cada mensaje consume cuota de Dialogflow
def handle_query():
    service = ChatbotService()
    response_builder = ResponseBuilder()
    try:
        data = request.get_json(silent=True) or {}
        message = data.get("message")
        if not isinstance(message, str) or not message.strip():
            return response_builder.add_message("Mensaje no puede estar vacío").add_status_code(400).build(), 400
        if len(message) > MAX_MESSAGE_LENGTH:
            return response_builder.add_message(f"El mensaje no puede superar los {MAX_MESSAGE_LENGTH} caracteres").add_status_code(400).build(), 400

        bot_reply = service.get_response(message)
        
        return response_builder.add_data({"reply": bot_reply}).add_status_code(200).build(), 200

    except Exception as e:
        sentry_sdk.capture_exception(e)
        return response_builder.add_message("Error interno del servidor").add_status_code(500).build(), 500