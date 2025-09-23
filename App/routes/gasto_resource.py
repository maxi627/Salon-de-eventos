from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from app.config import ResponseBuilder
from app.mapping import GastoSchema, ResponseSchema
from app.services.gasto_service import GastoService
from app.utils.decorators import admin_required

GastoBP = Blueprint('Gasto', __name__)
service = GastoService()
gasto_schema = GastoSchema()
response_schema = ResponseSchema()

@GastoBP.route('/gasto', methods=['GET'])
@jwt_required()
@admin_required()
def all():
    response_builder = ResponseBuilder()
    try:
        gastos = service.get_all()
        data = gasto_schema.dump(gastos, many=True)
        return response_builder.add_data(data).add_status_code(200).build(), 200
    except Exception as e:
        return response_builder.add_message(str(e)).add_status_code(500).build(), 500

@GastoBP.route('/gasto', methods=['POST'])
@jwt_required()
@admin_required()
def add():
    response_builder = ResponseBuilder()
    try:
        json_data = request.get_json()
        gasto = gasto_schema.load(json_data)
        nuevo_gasto = service.add(gasto)
        data = gasto_schema.dump(nuevo_gasto)
        return response_builder.add_data(data).add_status_code(201).build(), 201
    except ValidationError as err:
        return response_builder.add_message("Error de validación").add_data(err.messages).add_status_code(422).build(), 422
    except Exception as e:
        return response_builder.add_message(str(e)).add_status_code(500).build(), 500

@GastoBP.route('/gasto/<int:id>', methods=['DELETE'])
@jwt_required()
@admin_required()
def delete(id):
    response_builder = ResponseBuilder()
    try:
        if service.delete(id):
            return response_builder.add_message("Gasto eliminado").add_status_code(200).build(), 200
        else:
            return response_builder.add_message("Gasto no encontrado").add_status_code(404).build(), 404
    except Exception as e:
        return response_builder.add_message(str(e)).add_status_code(500).build(), 500