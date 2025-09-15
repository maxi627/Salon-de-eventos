from flask import Blueprint, request
from marshmallow import ValidationError

from app import limiter  # Usar el limiter global
from app.mapping import ReservaSchema, ResponseSchema
from app.services import ReservaService, ResponseBuilder

Reserva = Blueprint('Reserva', __name__)
service = ReservaService()
reserva_schema = ReservaSchema()
response_schema = ResponseSchema()

# Aplicar limitadores específicos en las rutas
@Reserva.route('/reserva', methods=['GET'])
@limiter.limit("5 per minute")
def all():
    response_builder = ResponseBuilder()
    try:
        data = reserva_schema.dump(service.all(), many=True)
        response_builder.add_message("Reserva found").add_status_code(200).add_data(data)
        return response_schema.dump(response_builder.build()), 200
    except Exception as e:
        response_builder.add_message("Error fetching Reserva").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500

@Reserva.route('/reserva/<int:id>', methods=['GET'])
@limiter.limit("5 per minute")
def one(id):
    response_builder = ResponseBuilder()
    try:
        data = service.find(id)
        if data:
            serialized_data = reserva_schema.dump(data)
            response_builder.add_message("Reserva found").add_status_code(200).add_data(serialized_data)
            return response_schema.dump(response_builder.build()), 200
        else:
            response_builder.add_message("Reserva not found").add_status_code(404).add_data({'id': id})
            return response_schema.dump(response_builder.build()), 404
    except Exception as e:
        response_builder.add_message("Error fetching Reserva").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500

@Reserva.route('/reserva', methods=['POST'])
@limiter.limit("5 per minute")
def add():
    response_builder = ResponseBuilder()
    try:
        json_data = request.json
        if not json_data:
            raise ValidationError("No data provided")

        reserva = reserva_schema.load(json_data)
        data = reserva_schema.dump(service.add(reserva))
        response_builder.add_message("Reserva created").add_status_code(201).add_data(data)
        return response_schema.dump(response_builder.build()), 201
    except ValidationError as err:
        response_builder.add_message("Validation error").add_status_code(422).add_data(err.messages)
        return response_schema.dump(response_builder.build()), 422
    except Exception as e:
        response_builder.add_message("Error creating Reserva").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500

@Reserva.route('/reserva/<int:id>', methods=['PUT'])
@limiter.limit("5 per minute")
def update(id):
    response_builder = ResponseBuilder()
    try:
        json_data = request.json
        if not json_data:
            raise ValidationError("No data provided")

        reserva = reserva_schema.load(json_data)
        updated_reserva = service.update(id, reserva)
        if not updated_reserva:
            response_builder.add_message("Reserva not found").add_status_code(404).add_data({'id': id})
            return response_schema.dump(response_builder.build()), 404

        data = reserva_schema.dump(updated_reserva)
        response_builder.add_message("Reserva updated").add_status_code(200).add_data(data)
        return response_schema.dump(response_builder.build()), 200
    except ValidationError as err:
        response_builder.add_message("Validation error").add_status_code(422).add_data(err.messages)
        return response_schema.dump(response_builder.build()), 422
    except Exception as e:
        response_builder.add_message("Error updating Reserva").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500

@Reserva.route('/reserva/<int:id>', methods=['DELETE'])
@limiter.limit("3 per minute")
def delete(id):
    response_builder = ResponseBuilder()
    try:
        if service.delete(id):
            response_builder.add_message("Reserva deleted").add_status_code(200).add_data({'id': id})
            return response_schema.dump(response_builder.build()), 200
        else:
            response_builder.add_message("Reserva not found").add_status_code(404).add_data({'id': id})
            return response_schema.dump(response_builder.build()), 404
    except Exception as e:
        response_builder.add_message("Error deleting Reserva").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500
@Reserva.route('/reserva/<int:id>/manage', methods=['POST'])
@limiter.limit("5 per minute")
def manage(id):
    response_builder = ResponseBuilder()
    try:
        json_data = request.json
        if not json_data or 'cantidad' not in json_data:
            raise ValidationError("Cantidad no proporcionada")

        cantidad = json_data['cantidad']
        
        # Llamar a la función de gestión de reserva
        updated_reserva = service.manage_reserva(id, cantidad)

        # Devolver el reserva actualizado
        response_builder.add_message("Reserva updated").add_status_code(200).add_data(updated_reserva)
        return response_schema.dump(response_builder.build()), 200

    except ValidationError as err:
        response_builder.add_message("Validation error").add_status_code(422).add_data(err.messages)
        return response_schema.dump(response_builder.build()), 422
    except Exception as e:
        response_builder.add_message("Error managing reserva").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500
