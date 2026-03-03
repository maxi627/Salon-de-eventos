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
from app.services import NotificationService, ReservaService
from app.utils.decorators import admin_required

UPLOAD_FOLDER = 'uploads/comprobantes'
# Definición del Blueprint
Reserva = Blueprint('Reserva', __name__)

@Reserva.route('/reserva', methods=['GET'])
@limiter.limit("100 per minute") # Límite aumentado para el panel admin
def all():
    # Instanciamos todo dentro para asegurar el contexto de Flask
    service = ReservaService()
    reserva_schema = ReservaSchema()
    response_builder = ResponseBuilder()
    
    try:
        data = reserva_schema.dump(service.all(), many=True)
        response_builder.add_message("Reservas encontradas").add_status_code(200).add_data(data)
        return response_builder.build(), 200
    except Exception as e:
        db.session.rollback() # <--- LIBERA LA CONEXIÓN VITAL
        sentry_sdk.capture_exception(e)
        return response_builder.add_message(f"Error al obtener reservas: {str(e)}").add_status_code(500).build(), 500

@Reserva.route('/reserva/<int:id>', methods=['GET'])
@limiter.limit("100 per minute")
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
        # 1. Verificar si viene el archivo
        if 'comprobante' not in request.files:
            return response_builder.add_message("No se subió ningún comprobante").add_status_code(400).build(), 400

        archivo = request.files['comprobante']
        
        # 2. Obtener los datos del formulario (no es JSON, es request.form)
        fecha_id = request.form.get('fecha_id')
        user_id = int(get_jwt_identity())

        if not fecha_id:
            raise ValidationError("Falta el ID de la fecha")

        # 3. Procesar y guardar el archivo físicamente
        if archivo.filename == '':
            return response_builder.add_message("Archivo sin nombre").add_status_code(400).build(), 400

        # Creamos un nombre seguro: reserva_fechaID_nombreoriginal.ext
        nombre_seguro = secure_filename(f"reserva_{fecha_id}_{archivo.filename}")
        
        # Aseguramos que la carpeta exista (por si las dudas)
        if not os.path.exists(UPLOAD_FOLDER):
            os.makedirs(UPLOAD_FOLDER)

        ruta_final = os.path.join(UPLOAD_FOLDER, nombre_seguro)
        archivo.save(ruta_final)

        # 4. Preparar el objeto para la base de datos
        # Guardamos solo el nombre del archivo o la subruta en comprobante_url
        reserva_data = {
            'fecha_id': int(fecha_id),
            'usuario_id': user_id,
            'comprobante_url': nombre_seguro, # Guardamos el nombre para construir la URL después
            'estado': 'pendiente',
            'cantidad_personas': request.form.get('cantidad_personas', 40)
        }
        
        reserva = reserva_schema.load(reserva_data)
        reserva.ip_aceptacion = request.remote_addr
        reserva.fecha_aceptacion = datetime.utcnow()

        # 5. Guardar en DB mediante el servicio
        data = reserva_schema.dump(service.add(reserva))
        
        response_builder.add_message("Reserva solicitada con éxito").add_status_code(201).add_data(data)
        return response_builder.build(), 201
        
    except ValidationError as err:
        db.session.rollback()
        return response_builder.add_message("Error de validación").add_status_code(422).add_data(err.messages).build(), 422
    except Exception as e:
        db.session.rollback()
        sentry_sdk.capture_exception(e)
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
        reserva.ip_aceptacion = request.remote_addr
        reserva.fecha_aceptacion = datetime.utcnow()

        data = reserva_schema.dump(service.add(reserva))
        response_builder.add_message("Reserva creada por admin").add_status_code(201).add_data(data)
        return response_builder.build(), 201
    except Exception as e:
        db.session.rollback()
        return response_builder.add_message(f"Error en creación admin: {str(e)}").add_status_code(500).build(), 500

@Reserva.route('/reserva/<int:id>', methods=['PUT'])
@limiter.limit("50 per minute")
@jwt_required()
@admin_required()
def update(id):
    service = ReservaService()
    notification_service = NotificationService()
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
            try:
                template_data = {
                    "user_name": f"{updated_reserva.usuario.nombre} {updated_reserva.usuario.apellido}",
                    "user_dni": updated_reserva.usuario.dni,
                    "event_date": updated_reserva.fecha.dia.strftime('%d/%m/%Y'),
                    "acceptance_date": updated_reserva.fecha_aceptacion.strftime('%d/%m/%Y a las %H:%M:%S UTC'),
                    "acceptance_ip": updated_reserva.ip_aceptacion,
                    "cantidad_personas": updated_reserva.cantidad_personas
                }
                html_contrato = render_template('contrato.html', **template_data)
                notification_service.send_email_confirmation(
                    to_email=updated_reserva.usuario.correo,
                    user_name=updated_reserva.usuario.nombre,
                    event_date=template_data['event_date'],
                    html_contract=html_contrato
                )
            except Exception as mail_err:
                sentry_sdk.capture_exception(mail_err)
        
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