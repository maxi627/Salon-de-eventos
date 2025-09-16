from flask import Blueprint, request
from flask_jwt_extended import create_access_token

from app.config import ResponseBuilder
from app.repositories import PersonaRepository

# Blueprint para la autenticación
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
            return response_builder.add_message("Correo y contraseña son requeridos").add_status_code(400).build()

        # 1. Buscar al usuario por su correo
        user = repo.get_by_email(correo)

        # 2. Verificar que el usuario exista y la contraseña sea correcta
        if user and user.check_password(password):
            # 3. Crear el token con el rol del usuario como "claim" adicional
            additional_claims = {"role": user.tipo}
            access_token = create_access_token(
                identity=user.id,
                additional_claims=additional_claims
            )
            return response_builder.add_data({"token": access_token}).add_status_code(200).build()

        return response_builder.add_message("Credenciales inválidas").add_status_code(401).build()

    except Exception as e:
        return response_builder.add_message(str(e)).add_status_code(500).build()