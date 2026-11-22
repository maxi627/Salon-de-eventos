from datetime import time
from types import SimpleNamespace

from app.reserva_datos import datos_reserva_online, horarios_del_contrato


def _reserva(turno, hora_inicio=None, hora_fin=None):
    return SimpleNamespace(turno=turno, hora_inicio=hora_inicio, hora_fin=hora_fin)


def test_contrato_usa_horario_del_turno_si_no_hay():
    assert horarios_del_contrato(_reserva("noche")) == {"hora_inicio": "20:30", "hora_fin": "04:30", "turno_nombre": "Noche"}
    assert horarios_del_contrato(_reserva("dia")) == {"hora_inicio": "11:00", "hora_fin": "19:00", "turno_nombre": "Día"}
    assert horarios_del_contrato(_reserva(None))["turno_nombre"] == "Día"


def test_contrato_respeta_horario_cargado():
    datos = horarios_del_contrato(_reserva("completo", time(12, 0), time(0, 0)))
    assert datos == {"hora_inicio": "12:00", "hora_fin": "00:00", "turno_nombre": "Completo"}


def test_reserva_online_siempre_es_de_dia():
    form = {"turno": "noche", "cantidad_personas": "30", "hora_inicio": "20:30", "hora_fin": "04:30"}
    datos = datos_reserva_online(form, fecha_id="12", user_id=7)
    assert datos["turno"] == "dia"
    assert datos["fecha_id"] == 12 and datos["usuario_id"] == 7
    assert datos["estado"] == "pendiente" and datos["comprobante_url"] == "procesando..."
    assert datos["cantidad_personas"] == "30"


def test_reserva_online_sin_cantidad_usa_40():
    assert datos_reserva_online({}, fecha_id=3, user_id=1)["cantidad_personas"] == 40
