import os
from datetime import datetime, timedelta

from flask import Blueprint
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from app.config import ResponseBuilder
from app.extensions import db
from app.mapping import ResponseSchema
from app.models import Fecha, Pago, Reserva
from app.utils.decorators import admin_required

Analytics = Blueprint('Analytics', __name__)
response_schema = ResponseSchema()

@Analytics.route('/analytics', methods=['GET'])
@jwt_required()
@admin_required()
def get_analytics():
    """
    Endpoint que calcula y devuelve métricas de contabilidad y tendencias
    basadas en los pagos confirmados.
    """
    response_builder = ResponseBuilder()
    try:
        hoy = datetime.utcnow()

        # Suma el saldo restante de todas las reservas confirmadas
        reservas_confirmadas = Reserva.query.filter_by(estado='confirmada').all()
        total_a_liquidar = sum(reserva.saldo_restante for reserva in reservas_confirmadas)

        # Obtiene los ingresos reales sumando los pagos por mes
        ingresos_por_mes_query = db.session.query(
            func.to_char(Pago.fecha_pago, 'YYYY-MM').label('mes'),
            func.sum(Pago.monto).label('ingresos_reales')
        ).group_by('mes').order_by('mes').all()

        # Obtiene la cantidad de reservas confirmadas por mes
        reservas_por_mes_query = db.session.query(
            func.to_char(Fecha.dia, 'YYYY-MM').label('mes'),
            func.count(Reserva.id).label('cantidad_reservas')
        ).join(Fecha).filter(Reserva.estado == 'confirmada').group_by('mes').all()

        # Combina los datos de ingresos y reservas
        stats_por_mes = {}
        for res in ingresos_por_mes_query:
            stats_por_mes[res.mes] = {"ingresos": float(res.ingresos_reales) if res.ingresos_reales else 0, "reservas": 0}
        
        for res in reservas_por_mes_query:
            if res.mes in stats_por_mes:
                stats_por_mes[res.mes]["reservas"] = res.cantidad_reservas
            else:
                # Si un mes tiene reservas pero no ingresos (pagos), se añade
                stats_por_mes[res.mes] = {"ingresos": 0, "reservas": res.cantidad_reservas}

        # Asegura que todos los meses del año actual estén presentes
        ingresos_año_completo = {}
        current_year = hoy.year
        for month in range(1, 13):
            month_key = f"{current_year}-{month:02d}"
            if month_key in stats_por_mes:
                ingresos_año_completo[month_key] = stats_por_mes[month_key]
            else:
                ingresos_año_completo[month_key] = {"ingresos": 0, "reservas": 0}

        mes_actual_str = hoy.strftime('%Y-%m')
        mes_anterior_str = (hoy.replace(day=1) - timedelta(days=1)).strftime('%Y-%m')

        ingresos_mes_actual = ingresos_año_completo.get(mes_actual_str, {}).get('ingresos', 0)
        reservas_mes_actual = ingresos_año_completo.get(mes_actual_str, {}).get('reservas', 0)
        ingresos_mes_anterior = ingresos_año_completo.get(mes_anterior_str, {}).get('ingresos', 0)
        
        tendencia_ingresos = 0
        if ingresos_mes_anterior > 0:
            tendencia_ingresos = ((ingresos_mes_actual - ingresos_mes_anterior) / ingresos_mes_anterior) * 100
        elif ingresos_mes_actual > 0:
            tendencia_ingresos = 100

        data = {
            "ingresos_mes_actual": ingresos_mes_actual,
            "reservas_mes_actual": reservas_mes_actual,
            "tendencia_ingresos_porcentaje": round(tendencia_ingresos, 2),
            "dinero_por_liquidar": total_a_liquidar,
            "ingresos_por_mes": ingresos_año_completo
        }
        
        response_builder.add_message("Analíticas generadas exitosamente.").add_status_code(200).add_data(data)
        return response_schema.dump(response_builder.build()), 200

    except Exception as e:
        response_builder.add_message("Error al generar analíticas").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500