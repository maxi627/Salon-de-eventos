from flask import Blueprint, request
from app.config import ResponseBuilder
from app.repositories import PersonaRepository
from flask_jwt_extended import create_access_token

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
            # Usamos el response_schema para devolver un JSON bien formado
            response = response_builder.add_message("Correo y contraseña son requeridos").add_status_code(400).build()
            return response, 400

        # 1. Buscar al usuario por su correo
        user = repo.get_by_email(correo)

        # 2. Verificar que el usuario exista y la contraseña sea correcta
        if user and user.check_password(password):
            # 3. Crear el token con el rol del usuario como "claim" adicional
            additional_claims = {"role": user.tipo}
            
            # --- CORRECCIÓN APLICADA AQUÍ ---
            # Convertimos el user.id a un string para cumplir con los requisitos de JWT
            access_token = create_access_token(
                identity=str(user.id),
                additional_claims=additional_claims
            )
            
            # Devolvemos el token en una respuesta JSON exitosa
            response = response_builder.add_message("Inicio de sesión exitoso").add_data({"token": access_token}).add_status_code(200).build()
            return response, 200

        # Si las credenciales son incorrectas
        response = response_builder.add_message("Credenciales inválidas").add_status_code(401).build()
        return response, 401

    except Exception as e:
        # Manejo de errores internos del servidor
        response = response_builder.add_message("Error interno del servidor").add_status_code(500).add_data(str(e)).build()
        return response, 500