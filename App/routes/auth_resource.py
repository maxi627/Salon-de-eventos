import os

import sentry_sdk
from flask import Blueprint, current_app, request
from flask_jwt_extended import create_access_token

from app.config import ResponseBuilder
from app.models import Persona  # Importamos el modelo Persona
from app.repositories import PersonaRepository
from app.services import \
    NotificationService  # Importamos el servicio de notificaciones

Auth = Blueprint('Auth', __name__)
repo = PersonaRepository()
notification_service = NotificationService()

@Auth.route('/login', methods=['POST'])
def login():
    response_builder = ResponseBuilder()
    try:
        data = request.get_json()
        correo = data.get("correo")
        password = data.get("password")

        if not correo or not password:
            return response_builder.add_message("Correo y contraseña son requeridos").add_status_code(400).build(), 400

        user = repo.get_by_email(correo)

        if user and user.check_password(password):

            sentry_sdk.set_user({"id": user.id, "email": user.correo, "role": user.tipo})

            additional_claims = {
                "role": user.tipo,
                "email": user.correo,
                "username": f"{user.nombre} {user.apellido}"
            }
            access_token = create_access_token(
                identity=str(user.id),
                additional_claims=additional_claims
            )

            response = response_builder.add_message("Inicio de sesión exitoso").add_data({"token": access_token}).add_status_code(200).build()
            return response, 200

        return response_builder.add_message("Credenciales inválidas").add_status_code(401).build(), 401

    except Exception as e:
        return response_builder.add_message("Error interno del servidor").add_status_code(500).add_data(str(e)).build(), 500

# --- NUEVA RUTA PARA SOLICITAR CAMBIO DE CONTRASEÑA ---
@Auth.route('/forgot-password', methods=['POST'])
def forgot_password():
    response_builder = ResponseBuilder()
    data = request.get_json()
    correo = data.get("correo")

    user = repo.get_by_email(correo)
    if user:
        token = user.get_reset_token()
        # Asumiendo que la URL de tu frontend está en una variable de entorno o config
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
        reset_link = f"{frontend_url}/reset-password/{token}"
        
        # Lógica para enviar el email
        notification_service.send_password_reset_email(
            to_email=user.correo,
            user_name=user.nombre,
            reset_link=reset_link
        )

    # Por seguridad, siempre devolvemos el mismo mensaje para no revelar si un email existe o no
    return response_builder.add_message(
        "Si existe una cuenta con ese correo, se ha enviado un enlace para restablecer la contraseña."
    ).add_status_code(200).build(), 200

# --- NUEVA RUTA PARA ESTABLECER LA NUEVA CONTRASEÑA ---
@Auth.route('/reset-password', methods=['POST'])
def reset_password():
    response_builder = ResponseBuilder()
    data = request.get_json()
    token = data.get("token")
    new_password = data.get("new_password")

    if not token or not new_password:
        return response_builder.add_message("El token y la nueva contraseña son requeridos.").add_status_code(400).build(), 400

    user = Persona.verify_reset_token(token)
    if not user:
        return response_builder.add_message("El token es inválido o ha expirado.").add_status_code(400).build(), 400

    user.set_password(new_password)
    repo.commit() # Guardamos los cambios en la BD

    return response_builder.add_message("Tu contraseña ha sido actualizada con éxito.").add_status_code(200).build(), 200