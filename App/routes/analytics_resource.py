import os
# --- 1. LÍNEA MODIFICADA: Añadimos timedelta a la importación ---
from datetime import datetime, timedelta

from flask import Blueprint
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from app.config import ResponseBuilder
from app.extensions import db
from app.mapping import ResponseSchema
from app.models import Fecha, Reserva
from app.utils.decorators import admin_required

# Blueprint para el endpoint de analíticas
Analytics = Blueprint('Analytics', __name__)
response_schema = ResponseSchema()

@Analytics.route('/analytics', methods=['GET'])
@jwt_required()
@admin_required()
def get_analytics():
    """
    Endpoint que calcula y devuelve métricas de contabilidad y tendencias
    basadas en las reservas confirmadas.
    """
    response_builder = ResponseBuilder()
    try:
        # --- Cálculos de Ingresos ---
        reservas_confirmadas = db.session.query(
            func.strftime('%Y-%m', Fecha.dia).label('mes'),
            func.sum(Reserva.valor_alquiler).label('ingresos_totales'),
            func.count(Reserva.id).label('cantidad_reservas')
        ).join(Fecha).filter(Reserva.estado == 'confirmada').group_by('mes').order_by('mes').all()

        # --- Procesamiento de Datos ---
        stats_por_mes = {
            res.mes: {
                "ingresos": res.ingresos_totales,
                "reservas": res.cantidad_reservas
            } for res in reservas_confirmadas
        }

        hoy = datetime.utcnow()
        mes_actual_str = hoy.strftime('%Y-%m')
        # Esta línea ahora funcionará porque timedelta ya fue importado
        mes_anterior_str = (hoy.replace(day=1) - timedelta(days=1)).strftime('%Y-%m')

        # --- Métricas Clave para el Dashboard ---
        ingresos_mes_actual = stats_por_mes.get(mes_actual_str, {}).get('ingresos', 0)
        reservas_mes_actual = stats_por_mes.get(mes_actual_str, {}).get('reservas', 0)
        
        ingresos_mes_anterior = stats_por_mes.get(mes_anterior_str, {}).get('ingresos', 0)

        tendencia_ingresos = 0
        if ingresos_mes_anterior > 0:
            tendencia_ingresos = ((ingresos_mes_actual - ingresos_mes_anterior) / ingresos_mes_anterior) * 100
        elif ingresos_mes_actual > 0:
            tendencia_ingresos = 100

        # --- Ensamblamos la Respuesta ---
        data = {
            "ingresos_mes_actual": ingresos_mes_actual,
            "reservas_mes_actual": reservas_mes_actual,
            "tendencia_ingresos_porcentaje": round(tendencia_ingresos, 2),
            "ingresos_por_mes": stats_por_mes
        }
        
        response_builder.add_message("Analíticas generadas exitosamente.").add_status_code(200).add_data(data)
        return response_schema.dump(response_builder.build()), 200

    except Exception as e:
        # --- 2. LÍNEA ELIMINADA: Quitamos el import de aquí que no tenía efecto ---
        response_builder.add_message("Error al generar analíticas").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500