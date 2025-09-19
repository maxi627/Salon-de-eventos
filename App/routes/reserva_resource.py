import sentry_sdk
from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import ValidationError

from app.config import ResponseBuilder
from app.extensions import limiter  # Usar el limiter global
from app.extensions import db
from app.mapping import ReservaSchema, ResponseSchema
from app.services import ReservaService
from app.utils.decorators import admin_required

Reserva = Blueprint('Reserva', __name__)
service = ReservaService()
reserva_schema = ReservaSchema()
response_schema = ResponseSchema()

# Aplicar limitadores específicos en las rutas
@Reserva.route('/reserva', methods=['GET'])
@limiter.limit("10 per minute")

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
@limiter.limit("10 per minute")
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
@limiter.limit("10 per minute")
@jwt_required()

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
@limiter.limit("10 per minute")
@jwt_required()
@admin_required() # <-- ¡AÑADIMOS LA PROTECCIÓN DE ADMIN!
def update(id):
    response_builder = ResponseBuilder()
    try:
        json_data = request.json
        if not json_data:
            raise ValidationError("No data provided")

        # Ya no cargamos con el schema, pasamos el diccionario directamente al servicio
        updated_reserva = service.update(id, json_data)
        
        data = reserva_schema.dump(updated_reserva)
        response_builder.add_message("Reserva actualizada").add_status_code(200).add_data(data)
        return response_schema.dump(response_builder.build()), 200
        
    except ValidationError as err:
        response_builder.add_message("Validation error").add_status_code(422).add_data(err.messages)
        return response_schema.dump(response_builder.build()), 422
    except Exception as e:
        response_builder.add_message("Error updating Reserva").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500
    

@Reserva.route('/reserva/<int:id>', methods=['DELETE'])
@limiter.limit("10 per minute")
@jwt_required()
@admin_required() # <-- ¡AÑADIMOS LA PROTECCIÓN DE ADMIN!
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
@Reserva.route('/reserva/<int:id>/approve', methods=['PUT'])
@jwt_required()
@admin_required()
def approve(id):
    response_builder = ResponseBuilder()
    try:
    
        reserva = service.find(id)
        if not reserva:
            response_builder.add_message("Reserva no encontrada").add_status_code(404)
            return response_schema.dump(response_builder.build()), 404

        reserva.estado = 'confirmada'
        reserva.fecha.estado = 'reservada'
        db.session.commit()
        admin_id = get_jwt_identity()
        sentry_sdk.capture_message(
            f"Admin ID {admin_id} aprobó la reserva para la fecha {reserva.fecha.dia}.",
            level="info"
        )
        response_builder.add_message("Reserva aprobada con éxito").add_status_code(200)
        return response_schema.dump(response_builder.build()), 200

    except Exception as e:
        response_builder.add_message("Error al aprobar la reserva").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500