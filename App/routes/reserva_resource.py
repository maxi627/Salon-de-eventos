import os
from datetime import datetime

import sentry_sdk
from flask import Blueprint, render_template, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import ValidationError
from werkzeug.utils import secure_filename

from app.config.response_builder import ResponseBuilder
from app.extensions import db, limiter
from app.mapping import ReservaSchema, ResponseSchema
from app.mapping.reserva_schema import ArrepentimientoSchema
from app.services import NotificationService, ReservaService
from app.tasks import enviar_contrato_background, procesar_reserva_background
from app.utils.decorators import admin_required

Reserva = Blueprint('Reserva', __name__)

def _enviar_contrato_confirmacion(reserva_obj):
    """
    Función de ayuda para generar el HTML del contrato y enviarlo 
    a través del NotificationService.
    """
    notification_service = NotificationService()
    try:
        template_data = {
            "user_name": f"{reserva_obj.usuario.nombre} {reserva_obj.usuario.apellido}",
            "user_dni": reserva_obj.usuario.dni,
            "event_date": reserva_obj.fecha.dia.strftime('%d/%m/%Y'),
            "acceptance_date": reserva_obj.fecha_aceptacion.strftime('%d/%m/%Y a las %H:%M:%S UTC'),
            "acceptance_ip": reserva_obj.ip_aceptacion,
            "cantidad_personas": reserva_obj.cantidad_personas,
            "hora_inicio": reserva_obj.hora_inicio.strftime('%H:%M') if reserva_obj.hora_inicio else None,
            "hora_fin": reserva_obj.hora_fin.strftime('%H:%M') if reserva_obj.hora_fin else None
        }
        html_contrato = render_template('contrato.html', **template_data)
        
        notification_service.send_email_confirmation(
            to_email=reserva_obj.usuario.correo,
            user_name=reserva_obj.usuario.nombre,
            event_date=template_data['event_date'],
            html_contract=html_contrato
        )
    except Exception as mail_err:
        sentry_sdk.capture_exception(mail_err)  

@Reserva.route('/reserva', methods=['GET'])
@admin_required()
@limiter.limit("100 per minute")
def all():
    service = ReservaService()
    reserva_schema = ReservaSchema()
    response_builder = ResponseBuilder()
    
    try:
        data = reserva_schema.dump(service.all(), many=True)
        response_builder.add_message("Reservas encontradas").add_status_code(200).add_data(data)
        return response_builder.build(), 200
    except Exception as e:
        db.session.rollback()
        sentry_sdk.capture_exception(e)
        return response_builder.add_message(f"Error al obtener reservas: {str(e)}").add_status_code(500).build(), 500

@Reserva.route('/reserva/<int:id>', methods=['GET'])
@limiter.limit("100 per minute")
@admin_required()
def one(id):
    service = ReservaService()
    reserva_schema = ReservaSchema()
    response_builder = ResponseBuilder()
    
    try:
        data = service.find(id)
        if data:
            serialized_data = reserva_schema.dump(data)
            response_builder.add_message("Reserva encontrada").add_status_code(200).add_data(serialized_data)
            return response_builder.build(), 200
        else:
            response_builder.add_message("Reserva no encontrada").add_status_code(404).add_data({'id': id})
            return response_builder.build(), 404
    except Exception as e:
        db.session.rollback()
        return response_builder.add_message(f"Error: {str(e)}").add_status_code(500).build(), 500

@Reserva.route('/reserva/solicitar', methods=['POST'])
@limiter.limit("20 per minute")
@jwt_required()
def request_by_user():
    service = ReservaService()
    reserva_schema = ReservaSchema()
    response_builder = ResponseBuilder()
    
    try:
        if 'comprobante' not in request.files:
            return response_builder.add_message("No se subió ningún comprobante").add_status_code(400).build(), 400

        archivo = request.files['comprobante']
        fecha_id = request.form.get('fecha_id')
        user_id = int(get_jwt_identity())

        if not fecha_id:
            raise ValidationError("Falta el ID de la fecha")

        if archivo.filename == '':
            return response_builder.add_message("Archivo sin nombre").add_status_code(400).build(), 400

        filename = secure_filename(archivo.filename)
        nombre_seguro = f"{int(datetime.utcnow().timestamp())}_{filename}"
        
        ruta_local = os.path.join('/home/flaskapp/app/uploads', nombre_seguro)
        archivo.save(ruta_local)

        reserva_data = {
            'fecha_id': int(fecha_id),
            'usuario_id': user_id,
            'comprobante_url': 'procesando...',
            'estado': 'pendiente',
            'cantidad_personas': request.form.get('cantidad_personas', 40),
            'hora_inicio': request.form.get('hora_inicio'), 
            'hora_fin': request.form.get('hora_fin')
        }
        
        reserva = reserva_schema.load(reserva_data)
        
        # --- CORRECCIÓN DE SEGURIDAD AQUÍ ---
        reserva.ip_aceptacion = request.remote_addr or "IP Desconocida"
        reserva.fecha_aceptacion = datetime.utcnow()

        reserva_creada = service.add(reserva)
        
        procesar_reserva_background.delay(reserva_creada.id, ruta_local)
        
        data = reserva_schema.dump(reserva_creada)
        response_builder.add_message("Reserva solicitada con éxito. ¡Te notificaremos en breve!").add_status_code(201).add_data(data)
        return response_builder.build(), 201
        
    except ValidationError as err:
        db.session.rollback()
        return response_builder.add_message("Error de validación").add_status_code(422).add_data(err.messages).build(), 422
    except Exception as e:
        db.session.rollback()
        sentry_sdk.capture_exception(e)
        
        if 'ruta_local' in locals() and os.path.exists(ruta_local):
            try:
                os.remove(ruta_local)
            except Exception:
                pass
                
        return response_builder.add_message(f"Error al procesar reserva: {str(e)}").add_status_code(500).build(), 500

@Reserva.route('/reserva/crear', methods=['POST'])
@limiter.limit("50 per minute")
@jwt_required()
@admin_required()
def create_for_admin():
    service = ReservaService()
    reserva_schema = ReservaSchema()
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
        
        # --- CORRECCIÓN DE SEGURIDAD AQUÍ ---
        reserva.ip_aceptacion = request.remote_addr or "IP Desconocida"
        reserva.fecha_aceptacion = datetime.utcnow()

        reserva_creada = service.add(reserva)

        if reserva_creada.estado == 'confirmada':
            enviar_contrato_background.delay(reserva_creada.id)

        data = reserva_schema.dump(reserva_creada)
        response_builder.add_message("Reserva creada por admin").add_status_code(201).add_data(data)
        return response_builder.build(), 201
        
    except ValidationError as err:
        db.session.rollback()
        return response_builder.add_message("Error de validación").add_status_code(422).add_data(err.messages).build(), 422
    except Exception as e:
        db.session.rollback()
        sentry_sdk.capture_exception(e)
        
        return response_builder.add_message(f"Error en creación admin: {str(e)}").add_status_code(500).build(), 500
    
@Reserva.route('/reserva/<int:id>', methods=['PUT'])
@limiter.limit("50 per minute")
@jwt_required()
@admin_required()
def update(id):
    service = ReservaService()
    reserva_schema = ReservaSchema()
    response_builder = ResponseBuilder()
    
    try:
        json_data = request.json
        if not json_data:
            raise ValidationError("No data provided")

        reserva_actual = service.find(id)
        if not reserva_actual:
            return response_builder.add_message("Reserva no encontrada").add_status_code(404).build(), 404
        
        estado_anterior = reserva_actual.estado
        nuevo_estado = json_data.get("estado")

        updated_reserva = service.update(id, json_data)
        
        if nuevo_estado == 'confirmada' and estado_anterior != 'confirmada':
            enviar_contrato_background.delay(updated_reserva.id)
        
        data = reserva_schema.dump(updated_reserva)
        response_builder.add_message("Reserva actualizada").add_status_code(200).add_data(data)
        return response_builder.build(), 200
        
    except Exception as e:
        db.session.rollback()
        return response_builder.add_message(f"Error al actualizar: {str(e)}").add_status_code(500).build(), 500
    
@Reserva.route('/reserva/<int:id>', methods=['DELETE'])
@limiter.limit("20 per minute")
@jwt_required()
@admin_required()
def delete(id):
    service = ReservaService()
    response_builder = ResponseBuilder()
    try:
        if service.delete(id):
            response_builder.add_message("Reserva archivada con éxito").add_status_code(200).add_data({'id': id})
            return response_builder.build(), 200
        else:
            response_builder.add_message("Reserva no encontrada").add_status_code(404).add_data({'id': id})
            return response_builder.build(), 404
    except Exception as e:
        db.session.rollback()
        return response_builder.add_message(f"Error al archivar: {str(e)}").add_status_code(500).build(), 500

@Reserva.route('/reserva/archivadas', methods=['GET'])
@jwt_required()
@admin_required()
@limiter.limit("100 per minute")
def all_archived():
    service = ReservaService()
    reserva_schema = ReservaSchema()
    response_builder = ResponseBuilder()
    try:
        data = reserva_schema.dump(service.get_all_archived(), many=True)
        response_builder.add_message("Reservas archivadas encontradas").add_status_code(200).add_data(data)
        return response_builder.build(), 200
    except Exception as e:
        db.session.rollback()
        return response_builder.add_message(f"Error: {str(e)}").add_status_code(500).build(), 500

@Reserva.route('/reserva/mis-reservas', methods=['GET'])
@jwt_required()
def get_user_reservations():
    service = ReservaService()
    reserva_schema = ReservaSchema()
    response_builder = ResponseBuilder()
    user_id = get_jwt_identity()
    try:
        reservas = service.get_by_user_id(user_id)
        data = reserva_schema.dump(reservas, many=True)
        response_builder.add_data(data).add_status_code(200).add_message("Reservas encontradas")
        return response_builder.build(), 200
    except Exception as e:
        db.session.rollback()
        return response_builder.add_message(str(e)).add_status_code(500).build(), 500

@Reserva.route('/reserva/buscar', methods=['GET'])
@jwt_required()
@admin_required()
@limiter.limit("120 per minute")
def search_live():
    service = ReservaService()
    reserva_schema = ReservaSchema()
    response_builder = ResponseBuilder()
    
    try:
        termino = request.args.get('q', '').strip()
        
        if not termino:
            data = []
        else:
            reservas_encontradas = service.search(termino)
            data = reserva_schema.dump(reservas_encontradas, many=True)
            
        response_builder.add_message("Búsqueda exitosa").add_status_code(200).add_data(data)
        return response_builder.build(), 200
        
    except Exception as e:
        db.session.rollback()
        sentry_sdk.capture_exception(e) 
        return response_builder.add_message(f"Error en búsqueda en vivo: {str(e)}").add_status_code(500).build(), 500
    
@Reserva.route('/reservas/arrepentimiento', methods=['POST'])
@limiter.limit("5 per minute") # Límite estricto para evitar abuso/spam
def solicitar_arrepentimiento():
    service = ReservaService()
    arrepentimiento_schema = ArrepentimientoSchema()
    response_builder = ResponseBuilder()
    
    try:
        # 1. Validación de entrada
        json_data = request.get_json()
        if not json_data:
            return response_builder.add_message("No se enviaron datos").add_status_code(400).build(), 400

        # Validación con Marshmallow
        datos_validados = arrepentimiento_schema.load(json_data)
        
        # 2. Lógica de negocio (Lanza ValueError si falla alguna regla)
        reserva_cancelada = service.procesar_arrepentimiento(datos_validados)
        
        # 3. Respuesta de éxito
        response_builder.add_message("Solicitud registrada. Reserva cancelada exitosamente.") \
                        .add_status_code(200) \
                        .add_data({"reserva_id": reserva_cancelada.id})
        return response_builder.build(), 200

    except ValidationError as e:
        # Errores de formato (marshmallow)
        return response_builder.add_message("Datos inválidos").add_status_code(422).add_data(e.messages).build(), 422

    except ValueError as e:
        # Errores de reglas de negocio (fechas, plazos, no encontrada)
        return response_builder.add_message(str(e)).add_status_code(400).build(), 400

    except Exception as e:
        # Errores de servidor
        db.session.rollback()
        sentry_sdk.capture_exception(e)
        return response_builder.add_message(f"Error interno: {str(e)}").add_status_code(500).build(), 500