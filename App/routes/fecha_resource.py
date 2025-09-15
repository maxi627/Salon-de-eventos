from flask import Blueprint, request
from marshmallow import ValidationError

from app.config import ResponseBuilder
from app.extensions import limiter
from app.mapping import FechaSchema, ResponseSchema
from app.services import FechaService

Fecha = Blueprint('Fecha', __name__)
service = FechaService()
fecha_schema = FechaSchema()
response_schema = ResponseSchema()

# Aplicar limitadores específicos en las rutas
@Fecha.route('/fecha', methods=['GET'])
@limiter.limit("5 per minute")
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
@limiter.limit("5 per minute")
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
@limiter.limit("5 per minute")
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
@limiter.limit("5 per minute")
def update(id):
    response_builder = ResponseBuilder()
    try:
        json_data = request.json
        if not json_data:
            raise ValidationError("No data provided")

        fecha = fecha_schema.load(json_data)
        updated_fecha = service.update(id, fecha)
        if not updated_fecha:
            response_builder.add_message("Fecha not found").add_status_code(404).add_data({'id': id})
            return response_schema.dump(response_builder.build()), 404

        data = fecha_schema.dump(updated_fecha)
        response_builder.add_message("Fecha updated").add_status_code(200).add_data(data)
        return response_schema.dump(response_builder.build()), 200
    except ValidationError as err:
        response_builder.add_message("Validation error").add_status_code(422).add_data(err.messages)
        return response_schema.dump(response_builder.build()), 422
    except Exception as e:
        response_builder.add_message("Error updating Fecha").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500

@Fecha.route('/fecha/<int:id>', methods=['DELETE'])
@limiter.limit("3 per minute")
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
