from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from app.config import ResponseBuilder
from app.extensions import db
from app.mapping import PagoSchema, ResponseSchema
from app.models import Pago, Reserva
from app.utils.decorators import admin_required

PagoBP = Blueprint('Pago', __name__)
pago_schema = PagoSchema()
response_schema = ResponseSchema()

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

        # Validamos los datos del pago
        pago = pago_schema.load(json_data)
        pago.reserva_id = reserva_id # Asignamos el ID de la reserva

        db.session.add(pago)
        db.session.commit()

        data = pago_schema.dump(pago)
        return response_builder.add_message("Pago registrado").add_status_code(201).add_data(data).build(), 201

    except ValidationError as err:
        return response_builder.add_message("Validation error").add_status_code(422).add_data(err.messages).build(), 422
    except Exception as e:
        db.session.rollback()
        return response_builder.add_message("Error al registrar el pago").add_status_code(500).add_data(str(e)).build(), 500