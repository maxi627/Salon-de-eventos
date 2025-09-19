import os
from datetime import datetime, timedelta

from flask import Blueprint
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from app.config import ResponseBuilder
from app.extensions import db
from app.mapping import ResponseSchema
from app.models import Fecha, Reserva
from app.utils.decorators import admin_required

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
        # --- 1. Cálculos de Ingresos y Saldos Pendientes ---
        # Usamos una subconsulta para obtener los totales generales
        # de todas las reservas confirmadas.
        saldos_totales = db.session.query(
            func.sum(Reserva.saldo_restante).label('total_a_liquidar')
        ).filter(Reserva.estado == 'confirmada').one()

        reservas_por_mes = db.session.query(
            func.to_char(Fecha.dia, 'YYYY-MM').label('mes'),
            func.sum(Reserva.valor_alquiler - Reserva.saldo_restante).label('ingresos_reales'),
            func.count(Reserva.id).label('cantidad_reservas')
        ).join(Fecha).filter(Reserva.estado == 'confirmada').group_by('mes').order_by('mes').all()

        # --- 2. Procesamiento de Datos ---
        stats_por_mes = {
            res.mes: {
                "ingresos": res.ingresos_reales,
                "reservas": res.cantidad_reservas
            } for res in reservas_por_mes
        }

        hoy = datetime.utcnow()
        mes_actual_str = hoy.strftime('%Y-%m')
        mes_anterior_str = (hoy.replace(day=1) - timedelta(days=1)).strftime('%Y-%m')

        # --- 3. Métricas Clave para el Dashboard ---
        ingresos_mes_actual = stats_por_mes.get(mes_actual_str, {}).get('ingresos', 0)
        reservas_mes_actual = stats_por_mes.get(mes_actual_str, {}).get('reservas', 0)
        ingresos_mes_anterior = stats_por_mes.get(mes_anterior_str, {}).get('ingresos', 0)
        
        # El total a liquidar es un valor único, no depende del mes.
        dinero_por_liquidar = saldos_totales.total_a_liquidar if saldos_totales.total_a_liquidar is not None else 0

        tendencia_ingresos = 0
        if ingresos_mes_anterior > 0:
            tendencia_ingresos = ((ingresos_mes_actual - ingresos_mes_anterior) / ingresos_mes_anterior) * 100
        elif ingresos_mes_actual > 0:
            tendencia_ingresos = 100

        # --- 4. Ensamblamos la Respuesta ---
        data = {
            "ingresos_mes_actual": ingresos_mes_actual,
            "reservas_mes_actual": reservas_mes_actual,
            "tendencia_ingresos_porcentaje": round(tendencia_ingresos, 2),
            "dinero_por_liquidar": dinero_por_liquidar, # <-- Nuevo dato añadido
            "ingresos_por_mes": stats_por_mes
        }
        
        response_builder.add_message("Analíticas generadas exitosamente.").add_status_code(200).add_data(data)
        return response_schema.dump(response_builder.build()), 200

    except Exception as e:
        response_builder.add_message("Error al generar analíticas").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500