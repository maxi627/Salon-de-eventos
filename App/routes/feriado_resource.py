from datetime import date, datetime, timedelta

import sentry_sdk
from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from app.config.response_builder import ResponseBuilder
from app.extensions import db
from app.models import Feriado
from app.utils.decorators import admin_required

FeriadoBP = Blueprint('Feriado', __name__)


@FeriadoBP.route('/feriado', methods=['GET'])
@jwt_required()
@admin_required()
def listar():
    """Feriados desde `desde` (por defecto, ayer: margen por la diferencia horaria) en adelante.
    Solo para el panel: el calendario público no los muestra."""
    response_builder = ResponseBuilder()
    try:
        texto = request.args.get('desde')
        try:
            desde = datetime.strptime(texto, '%Y-%m-%d').date() if texto else date.today() - timedelta(days=1)
        except ValueError:
            return response_builder.add_message("Formato de fecha inválido. Usar YYYY-MM-DD.").add_status_code(400).build(), 400

        feriados = Feriado.query.filter(Feriado.fecha >= desde).order_by(Feriado.fecha).all()
        data = [{'fecha': f.fecha.isoformat(), 'nombre': f.nombre, 'tipo': f.tipo} for f in feriados]
        return response_builder.add_data(data).add_status_code(200).add_message("Feriados encontrados").build(), 200
    except Exception as e:
        sentry_sdk.capture_exception(e)
        db.session.rollback()
        return response_builder.add_message("Error al obtener los feriados").add_status_code(500).build(), 500
