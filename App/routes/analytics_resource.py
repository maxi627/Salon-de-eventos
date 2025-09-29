import locale
import os
from datetime import date, datetime, timedelta

import pytz
from flask import Blueprint, Response, render_template, request
from flask_jwt_extended import jwt_required
from sqlalchemy import extract, func
from weasyprint import HTML

from app.config import ResponseBuilder
# --- INICIO DE LA CORRECCIÓN ---
from app.extensions import db, limiter  # Importamos el limiter
# --- FIN DE LA CORRECCIÓN ---
from app.mapping import ResponseSchema
from app.models import Fecha, Gasto, Pago, Reserva
from app.utils.decorators import admin_required

Analytics = Blueprint('Analytics', __name__)
response_schema = ResponseSchema()

@Analytics.route('/analytics', methods=['GET'])
@jwt_required()
@admin_required()
@limiter.limit("50 per minute") # <-- LÍNEA AÑADIDA
def get_analytics():
    """
    Endpoint que calcula y devuelve métricas de contabilidad y tendencias
    para un mes y año específicos.
    """
    response_builder = ResponseBuilder()
    try:
        today = datetime.utcnow()
        mes_seleccionado = int(request.args.get('mes', today.month))
        anio_seleccionado = int(request.args.get('anio', today.year))

        # --- CÁLCULO DE GASTOS PARA EL MES SELECCIONADO ---
        gastos_mes_seleccionado = db.session.query(func.sum(Gasto.monto)).filter(
            extract('year', Gasto.fecha) == anio_seleccionado,
            extract('month', Gasto.fecha) == mes_seleccionado
        ).scalar() or 0.0

        # --- CÁLCULO DE INGRESOS PARA EL MES SELECCIONADO ---
        ingresos_mes_seleccionado = db.session.query(func.sum(Pago.monto)).filter(
            extract('year', Pago.fecha_pago) == anio_seleccionado,
            extract('month', Pago.fecha_pago) == mes_seleccionado
        ).scalar() or 0.0
        
        # --- CÁLCULO DE INGRESOS PARA EL MES ANTERIOR (PARA LA TENDENCIA) ---
        fecha_mes_seleccionado = date(anio_seleccionado, mes_seleccionado, 1)
        fecha_mes_anterior = (fecha_mes_seleccionado - timedelta(days=1)).replace(day=1)
        
        ingresos_mes_anterior = db.session.query(func.sum(Pago.monto)).filter(
            extract('year', Pago.fecha_pago) == fecha_mes_anterior.year,
            extract('month', Pago.fecha_pago) == fecha_mes_anterior.month
        ).scalar() or 0.0

        # --- LÓGICA DE RESERVAS Y GRÁFICO (PARA EL AÑO COMPLETO) ---
        reservas_confirmadas = Reserva.query.filter_by(estado='confirmada').all()
        total_a_liquidar = sum(reserva.saldo_restante for reserva in reservas_confirmadas)

        ingresos_por_mes_query = db.session.query(
            func.to_char(Pago.fecha_pago, 'YYYY-MM').label('mes'),
            func.sum(Pago.monto).label('ingresos_reales')
        ).filter(extract('year', Pago.fecha_pago) == anio_seleccionado).group_by('mes').order_by('mes').all()

        reservas_por_mes_query = db.session.query(
            func.to_char(Fecha.dia, 'YYYY-MM').label('mes'),
            func.count(Reserva.id).label('cantidad_reservas')
        ).join(Fecha).filter(
            Reserva.estado == 'confirmada',
            extract('year', Fecha.dia) == anio_seleccionado
        ).group_by('mes').all()
        
        stats_por_mes = {}
        for res in ingresos_por_mes_query:
            stats_por_mes[res.mes] = {"ingresos": float(res.ingresos_reales) if res.ingresos_reales else 0, "reservas": 0}
        
        for res in reservas_por_mes_query:
            if res.mes in stats_por_mes:
                stats_por_mes[res.mes]["reservas"] = res.cantidad_reservas
            else:
                stats_por_mes[res.mes] = {"ingresos": 0, "reservas": res.cantidad_reservas}
        
        ingresos_año_completo = {}
        for month in range(1, 13):
            month_key = f"{anio_seleccionado}-{month:02d}"
            ingresos_año_completo[month_key] = stats_por_mes.get(month_key, {"ingresos": 0, "reservas": 0})
        
        reservas_mes_seleccionado = ingresos_año_completo.get(f"{anio_seleccionado}-{mes_seleccionado:02d}", {}).get('reservas', 0)

        # --- CÁLCULO DE TENDENCIA (ACTUALIZADO) ---
        tendencia_ingresos = 0
        if ingresos_mes_anterior > 0:
            tendencia_ingresos = ((ingresos_mes_seleccionado - ingresos_mes_anterior) / ingresos_mes_anterior) * 100
        elif ingresos_mes_seleccionado > 0:
            tendencia_ingresos = 100

        data = {
            "ingresos_mes_seleccionado": ingresos_mes_seleccionado,
            "gastos_mes_seleccionado": gastos_mes_seleccionado,
            "beneficio_neto_mes": ingresos_mes_seleccionado - gastos_mes_seleccionado,
            "reservas_mes_seleccionado": reservas_mes_seleccionado,
            "tendencia_ingresos_porcentaje": round(tendencia_ingresos, 2),
            "dinero_por_liquidar": total_a_liquidar,
            "ingresos_por_mes": ingresos_año_completo
        }
        
        response_builder.add_message("Analíticas generadas exitosamente.").add_status_code(200).add_data(data)
        return response_schema.dump(response_builder.build()), 200

    except Exception as e:
        response_builder.add_message("Error al generar analíticas").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500


@Analytics.route('/analytics/reporte-pdf', methods=['GET'])
@jwt_required()
@admin_required()
def download_report():
    try:
        # Establecer el idioma a Español (Argentina) para formatos
        locale.setlocale(locale.LC_ALL, 'es_AR.UTF-8')
        art_tz = pytz.timezone('America/Argentina/Buenos_Aires')

        today_utc = datetime.utcnow()
        mes = int(request.args.get('mes', today_utc.month))
        anio = int(request.args.get('anio', today_utc.year))

        pagos_del_mes = db.session.query(Pago).filter(
            extract('year', Pago.fecha_pago) == anio,
            extract('month', Pago.fecha_pago) == mes
        ).order_by(Pago.fecha_pago).all()

        gastos_del_mes = db.session.query(Gasto).filter(
            extract('year', Gasto.fecha) == anio,
            extract('month', Gasto.fecha) == mes
        ).order_by(Gasto.fecha).all()

        total_ingresos = sum(p.monto for p in pagos_del_mes)
        total_gastos = sum(g.monto for g in gastos_del_mes)
        beneficio_neto = total_ingresos - total_gastos

        nombre_mes = date(anio, mes, 1).strftime('%B').capitalize()
        fecha_generacion_local = today_utc.replace(tzinfo=pytz.utc).astimezone(art_tz)
        fecha_generacion_formateada = fecha_generacion_local.strftime('%d/%m/%Y %H:%M:%S')

        def format_currency(value):
            return locale.currency(value, symbol=True, grouping=True)

        html_renderizado = render_template(
            'reporte_contable.html',
            mes=nombre_mes,
            anio=anio,
            fecha_generacion=fecha_generacion_formateada,
            total_ingresos=total_ingresos,
            total_gastos=total_gastos,
            beneficio_neto=beneficio_neto,
            pagos=pagos_del_mes,
            gastos=gastos_del_mes,
            format_currency=format_currency
        )

        pdf = HTML(string=html_renderizado).write_pdf()
        return Response(
            pdf,
            mimetype='application/pdf',
            headers={'Content-Disposition': f'attachment;filename=reporte_{nombre_mes.lower()}_{anio}.pdf'}
        )
    except Exception as e:
        locale.setlocale(locale.LC_ALL, '')
        return {"message": f"Error al generar el reporte: {str(e)}"}, 500