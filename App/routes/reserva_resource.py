from datetime import datetime

import sentry_sdk
from flask import Blueprint, render_template, request
from flask_jwt_extended import get_jwt_identity, jwt_required
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

@limiter.limit("50 per minute")

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
@limiter.limit("50 per minute")
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

@Reserva.route('/reserva/solicitar', methods=['POST'])
@limiter.limit("20 per minute")
@jwt_required() # Solo requiere que el usuario esté logueado
def request_by_user():
    response_builder = ResponseBuilder()
    try:
        json_data = request.json
        if not json_data:
            raise ValidationError("No data provided")

        # Obtenemos el ID del usuario de forma segura desde el token
        user_id = int(get_jwt_identity())
        json_data['usuario_id'] = user_id
        
        reserva = reserva_schema.load(json_data)
        
        reserva.ip_aceptacion = request.remote_addr
        reserva.fecha_aceptacion = datetime.utcnow()

        data = reserva_schema.dump(service.add(reserva))

        response_builder.add_message("Reserva solicitada con éxito").add_status_code(201).add_data(data)
        return response_schema.dump(response_builder.build()), 201
        
    except ValidationError as err:
        response_builder.add_message("Validation error").add_status_code(422).add_data(err.messages)
        return response_schema.dump(response_builder.build()), 422
    except Exception as e:
        response_builder.add_message("Error al crear la reserva").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500


# --- 3. RUTA MODIFICADA PARA LA CREACIÓN DEL ADMINISTRADOR ---
@Reserva.route('/reserva/crear', methods=['POST'])
@limiter.limit("50 per minute")
@jwt_required()
@admin_required() # Requiere permisos de admin
def create_for_admin():
    response_builder = ResponseBuilder()
    try:
        json_data = request.json
        if not json_data:
            raise ValidationError("No data provided")

        if 'fecha_dia' in json_data and json_data['fecha_dia']:
            try:
                fecha_str = json_data.pop('fecha_dia')
                dia_obj = datetime.strptime(fecha_str, '%Y-%m-%d').date()
                fecha_entidad = service.fecha_service.get_or_create(dia_obj)
                json_data['fecha_id'] = fecha_entidad.id
            except (ValueError, TypeError):
                raise ValidationError("El formato de fecha_dia es inválido. Usar YYYY-MM-DD.")

        reserva = reserva_schema.load(json_data)
        
        reserva.ip_aceptacion = request.remote_addr
        reserva.fecha_aceptacion = datetime.utcnow()

        data = reserva_schema.dump(service.add(reserva))

        response_builder.add_message("Reserva creada por admin").add_status_code(201).add_data(data)
        return response_schema.dump(response_builder.build()), 201
        
    except ValidationError as err:
        response_builder.add_message("Validation error").add_status_code(422).add_data(err.messages)
        return response_schema.dump(response_builder.build()), 422
    except Exception as e:
        response_builder.add_message("Error al crear la reserva").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500
    
@Reserva.route('/reserva/<int:id>', methods=['PUT'])
@limiter.limit("50 per minute")
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
@limiter.limit("20 per minute")
@jwt_required()
@admin_required()
def delete(id):
    response_builder = ResponseBuilder()
    try:
        if service.delete(id):
            response_builder.add_message("Reserva eliminada con éxito").add_status_code(200).add_data({'id': id})
            return response_schema.dump(response_builder.build()), 200
        else:
            response_builder.add_message("Reserva no encontrada").add_status_code(404).add_data({'id': id})
            return response_schema.dump(response_builder.build()), 404
    except Exception as e:
        # --- INICIO DE LA CORRECCIÓN ---
        # Capturamos el error específico de la regla de negocio y devolvemos un código 409 (Conflicto)
        if "No se puede eliminar una reserva que tiene pagos registrados" in str(e):
            response_builder.add_message(str(e)).add_status_code(409)
            return response_schema.dump(response_builder.build()), 409
        # --- FIN DE LA CORRECCIÓN ---
        
        response_builder.add_message("Error al eliminar la Reserva").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500

@Reserva.route('/reserva/mis-reservas', methods=['GET'])
@jwt_required()
def get_user_reservations():
    user_id = get_jwt_identity()
    response_builder = ResponseBuilder()
    try:
        reservas = service.get_by_user_id(user_id)
        data = reserva_schema.dump(reservas, many=True)
        return response_builder.add_data(data).add_status_code(200).build(), 200
    except Exception as e:
        return response_builder.add_message(str(e)).add_status_code(500).build(), 500