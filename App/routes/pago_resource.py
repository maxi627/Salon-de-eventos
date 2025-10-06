import os

from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from app.config import ResponseBuilder
from app.extensions import db
from app.mapping import PagoSchema, ResponseSchema
from app.models import Pago, Reserva
from app.services.pago_service import PagoService
from app.utils.decorators import admin_required

PagoBP = Blueprint('Pago', __name__)
pago_schema = PagoSchema()
response_schema = ResponseSchema()
pago_service = PagoService()

@PagoBP.route('/reserva/<int:reserva_id>/pagos', methods=['POST'])
@jwt_required()
@admin_required()
def add_pago(reserva_id):
    response_builder = ResponseBuilder()
    try:
        json_data = request.json
        reserva = Reserva.query.get(reserva_id)
        if not reserva:
            return response_builder.add_message("Reserva no encontrada").add_status_code(404).build(), 404

        monto_pago = json_data.get('monto', 0)
        if monto_pago > reserva.saldo_restante:
            raise ValidationError("El monto del pago no puede ser mayor que el saldo restante.")

        pago = pago_schema.load(json_data)
        pago.reserva_id = reserva_id

        db.session.add(pago)
        db.session.commit()

        data = pago_schema.dump(pago)
        return response_builder.add_message("Pago registrado").add_status_code(201).add_data(data).build(), 201

    except ValidationError as err:
        return response_builder.add_message("Error de validación").add_status_code(422).add_data(str(err)).build(), 422
    except Exception as e:
        db.session.rollback()
        return response_builder.add_message("Error al registrar el pago").add_status_code(500).add_data(str(e)).build(), 500
    
@PagoBP.route('/pago/<int:pago_id>', methods=['DELETE'])
@jwt_required()
@admin_required()
def delete_pago(pago_id):
    response_builder = ResponseBuilder()
    json_data = request.get_json()
    master_password = json_data.get('master_password')

    # 1. Verificamos la contraseña maestra
    if master_password != os.getenv('MASTER_DELETE_PASSWORD'):
        return response_builder.add_message("Contraseña incorrecta").add_status_code(403).build(), 403

    try:
        # 2. Si la contraseña es correcta, intentamos eliminar
        if pago_service.delete_pago(pago_id):
            return response_builder.add_message("Pago eliminado con éxito").add_status_code(200).build(), 200
        else:
            return response_builder.add_message("Pago no encontrado").add_status_code(404).build(), 404
            
    except Exception as e:
        return response_builder.add_message(str(e)).add_status_code(500).build(), 500