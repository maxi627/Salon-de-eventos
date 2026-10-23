import sentry_sdk
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.tasks import check_pending_reservations, check_upcoming_reservations
from app.utils.decorators import admin_required

# Creamos un nuevo Blueprint para las rutas de prueba (sólo administradores)
TestNotifications = Blueprint('TestNotifications', __name__)

@TestNotifications.route('/test/pending', methods=['GET'])
@jwt_required()
@admin_required()
def test_pending():
    """
    Endpoint para ejecutar manualmente la tarea que revisa reservas pendientes.
    """
    print("--- EJECUTANDO PRUEBA DE NOTIFICACIÓN PENDIENTE ---")
    try:
        check_pending_reservations()
        return jsonify(message="Tarea de reservas pendientes ejecutada. Revisa tu celular."), 200
    except Exception as e:
        sentry_sdk.capture_exception(e)
        return jsonify(message="Error al ejecutar la tarea"), 500


@TestNotifications.route('/test/upcoming', methods=['GET'])
@jwt_required()
@admin_required()
def test_upcoming():
    """
    Endpoint para ejecutar manually la tarea que revisa reservas próximas.
    """
    print("--- EJECUTANDO PRUEBA DE NOTIFICACIÓN PRÓXIMA ---")
    try:
        check_upcoming_reservations()
        return jsonify(message="Tarea de reservas próximas ejecutada. Revisa tu celular."), 200
    except Exception as e:
        sentry_sdk.capture_exception(e)
        return jsonify(message="Error al ejecutar la tarea"), 500