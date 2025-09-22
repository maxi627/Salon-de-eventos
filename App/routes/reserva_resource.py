from datetime import datetime

import sentry_sdk
from flask import Blueprint, render_template, request
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from app.config import ResponseBuilder
from app.extensions import limiter  # Usar el limiter global
from app.mapping import ReservaSchema, ResponseSchema
from app.services import NotificationService, ReservaService
from app.utils.decorators import admin_required

Reserva = Blueprint('Reserva', __name__)
service = ReservaService()
reserva_schema = ReservaSchema()
response_schema = ResponseSchema()
notification_service = NotificationService()

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

        # 1. Cargamos y validamos PRIMERO los datos que envía el usuario.
        reserva = reserva_schema.load(json_data)
        
        # 2. AÑADIMOS los datos generados por el servidor al objeto ya creado.
        reserva.ip_aceptacion = request.remote_addr
        reserva.fecha_aceptacion = datetime.utcnow()

        # 3. Pasamos el objeto completo al servicio para guardarlo.
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
@admin_required()
def update(id):
    response_builder = ResponseBuilder()
    try:
        json_data = request.json
        if not json_data:
            raise ValidationError("No data provided")

        reserva_actual = service.find(id)
        if not reserva_actual:
            response_builder.add_message("Reserva no encontrada").add_status_code(404)
            return response_schema.dump(response_builder.build()), 404
        
        estado_anterior = reserva_actual.estado
        nuevo_estado = json_data.get("estado")

        updated_reserva = service.update(id, json_data)
        
        if nuevo_estado == 'confirmada' and estado_anterior != 'confirmada':
            try:
                # --- INICIO DE LA CORRECCIÓN ---

                # 1. Preparamos los datos para la plantilla
                template_data = {
                    "user_name": f"{updated_reserva.usuario.nombre} {updated_reserva.usuario.apellido}",
                    "user_dni": updated_reserva.usuario.dni,
                    "event_date": updated_reserva.fecha.dia.strftime('%d/%m/%Y'),
                    "acceptance_date": updated_reserva.fecha_aceptacion.strftime('%d/%m/%Y a las %H:%M:%S UTC'),
                    "acceptance_ip": updated_reserva.ip_aceptacion
                }
                
                # 2. Renderizamos el HTML aquí, dentro de la ruta
                html_contrato = render_template('contrato.html', **template_data)
                
                # 3. Pasamos todos los datos necesarios al servicio
                notification_service.send_email_confirmation(
                    to_email=updated_reserva.usuario.correo,
                    user_name=updated_reserva.usuario.nombre,
                    event_date=template_data['event_date'],
                    html_contract=html_contrato # Le pasamos el HTML ya listo
                )

                # --- FIN DE LA CORRECCIÓN ---
            except Exception as e:
                sentry_sdk.capture_exception(e)
        
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
