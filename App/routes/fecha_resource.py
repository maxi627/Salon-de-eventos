from datetime import datetime

from flask import Blueprint, request
from marshmallow import ValidationError

from app.config import ResponseBuilder
from app.extensions import limiter
from app.mapping import FechaSchema, ResponseSchema
from app.services import FechaService
from app.utils.decorators import admin_required

Fecha = Blueprint('Fecha', __name__)
service = FechaService()
fecha_schema = FechaSchema()
response_schema = ResponseSchema()

# Aplicar limitadores específicos en las rutas
@Fecha.route('/fecha', methods=['GET'])
@limiter.limit("10 per minute")
def all():
    response_builder = ResponseBuilder()
    try:
        data = fecha_schema.dump(service.all(), many=True)
        response_builder.add_message("Fecha found").add_status_code(200).add_data(data)
        return response_schema.dump(response_builder.build()), 200
    except Exception as e:
        response_builder.add_message("Error fetching Fecha").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500

@Fecha.route('/fecha/<int:id>', methods=['GET'])
@limiter.limit("10 per minute")
def one(id):
    response_builder = ResponseBuilder()
    try:
        data = service.find(id)
        if data:
            serialized_data = fecha_schema.dump(data)
            response_builder.add_message("Fecha found").add_status_code(200).add_data(serialized_data)
            return response_schema.dump(response_builder.build()), 200
        else:
            response_builder.add_message("Fecha not found").add_status_code(404).add_data({'id': id})
            return response_schema.dump(response_builder.build()), 404
    except Exception as e:
        response_builder.add_message("Error fetching Fecha").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500

@Fecha.route('/fecha', methods=['POST'])
@limiter.limit("10 per minute")
@admin_required()
def add():
    response_builder = ResponseBuilder()
    try:
        json_data = request.json
        if not json_data:
            raise ValidationError("No data provided")

        fecha = fecha_schema.load(json_data)
        data = fecha_schema.dump(service.add(fecha))
        response_builder.add_message("Fecha created").add_status_code(201).add_data(data)
        return response_schema.dump(response_builder.build()), 201
    except ValidationError as err:
        response_builder.add_message("Validation error").add_status_code(422).add_data(err.messages)
        return response_schema.dump(response_builder.build()), 422
    except Exception as e:
        response_builder.add_message("Error creating Fecha").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500

@Fecha.route('/fecha/<int:id>', methods=['PUT'])
@limiter.limit("10 per minute")
@admin_required()
def update(id):
    response_builder = ResponseBuilder()
    try:
        json_data = request.json
        if not json_data:
            # Validamos que se haya enviado algún dato.
            raise ValidationError("No se proporcionaron datos para actualizar.")

        # Pasamos el diccionario de datos directamente al servicio.
        # Ya no usamos fecha_schema.load() para las actualizaciones.
        updated_fecha = service.update(id, json_data)
        
        data = fecha_schema.dump(updated_fecha)
        response_builder.add_message("Fecha actualizada").add_status_code(200).add_data(data)
        return response_schema.dump(response_builder.build()), 200
        
    except (ValidationError, ValueError) as err:
        # Capturamos tanto errores de validación como de tipo de dato (ej. precio no numérico).
        response_builder.add_message("Error de validación").add_status_code(422).add_data(str(err))
        return response_schema.dump(response_builder.build()), 422
    except Exception as e:
        response_builder.add_message("Error al actualizar la Fecha").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500

@Fecha.route('/fecha/<int:id>', methods=['DELETE'])
@limiter.limit("5 per minute")
@admin_required()
def delete(id):
    response_builder = ResponseBuilder()
    try:
        if service.delete(id):
            response_builder.add_message("Fecha deleted").add_status_code(200).add_data({'id': id})
            return response_schema.dump(response_builder.build()), 200
        else:
            response_builder.add_message("Fecha not found").add_status_code(404).add_data({'id': id})
            return response_schema.dump(response_builder.build()), 404
    except Exception as e:
        response_builder.add_message("Error deleting Fecha").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500
@Fecha.route('/fecha/by-date/<string:date_string>', methods=['GET'])
@limiter.limit("10 per minute")
def get_or_create_by_date(date_string):
    """
    Busca una fecha por su string YYYY-MM-DD.
    Si no existe en la BD, la crea y la devuelve.
    Esto permite al frontend obtener un ID válido para cualquier fecha futura.
    """
    response_builder = ResponseBuilder()
    try:
        dia = datetime.strptime(date_string, '%Y-%m-%d').date()
        fecha_obj = service.get_or_create(dia)
        serialized_data = fecha_schema.dump(fecha_obj)
        response_builder.add_message("Fecha encontrada o creada").add_status_code(200).add_data(serialized_data)
        return response_schema.dump(response_builder.build()), 200

    except ValueError:
        response_builder.add_message("Formato de fecha inválido. Usar YYYY-MM-DD.").add_status_code(400)
        return response_schema.dump(response_builder.build()), 400
    except Exception as e:
        response_builder.add_message("Error procesando la fecha").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500