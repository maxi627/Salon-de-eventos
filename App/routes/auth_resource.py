# --- 1. AÑADE ESTE IMPORT DE SENTRY ---
import sentry_sdk
from flask import Blueprint, request
from flask_jwt_extended import create_access_token

from app.config import ResponseBuilder
from app.repositories import PersonaRepository

Auth = Blueprint('Auth', __name__)
repo = PersonaRepository()

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