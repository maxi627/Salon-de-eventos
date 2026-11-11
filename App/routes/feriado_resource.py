from datetime import date, datetime, timedelta

import sentry_sdk
from flask import Blueprint, request

from app.config.response_builder import ResponseBuilder
from app.extensions import cache, db, limiter
from app.models import Feriado

FeriadoBP = Blueprint('Feriado', __name__)


@FeriadoBP.route('/feriado', methods=['GET'])
@limiter.limit("100 per minute")
@cache.cached(timeout=3600, query_string=True)
def listar():
    """Feriados desde `desde` (por defecto, ayer: margen por la diferencia horaria) en adelante.
    Es pública: los feriados son información pública y los usan el panel y el calendario de
    reservas. Se cachea una hora (la sincronización con la API corre una vez por semana)."""
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
