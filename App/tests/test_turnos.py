from datetime import time
from types import SimpleNamespace

import pytest

from app.turnos import (
    HORARIOS,
    TURNOS,
    aplicar_estados,
    estados_de_turnos,
    normalizar_turno,
    turnos_cubiertos,
    validar_turno_disponible,
)


def r(turno, estado):
    return SimpleNamespace(turno=turno, estado=estado)


def test_sin_reservas_todo_disponible():
    assert estados_de_turnos([]) == ("disponible", "disponible")


def test_dia_confirmada_y_noche_pendiente():
    assert estados_de_turnos([r("dia", "confirmada"), r("noche", "pendiente")]) == ("reservada", "pendiente")


def test_completo_cubre_los_dos():
    assert estados_de_turnos([r("completo", "confirmada")]) == ("reservada", "reservada")


def test_canceladas_y_archivadas_no_cuentan():
    assert estados_de_turnos([r("dia", "cancelada"), r("noche", "archivada")]) == ("disponible", "disponible")


def test_archivar_cancelada_no_libera_otra_reserva():
    vieja = r("dia", "cancelada")
    nueva = r("dia", "confirmada")
    vieja.estado = "archivada"
    assert estados_de_turnos([vieja, nueva]) == ("reservada", "disponible")


def test_confirmada_gana_a_pendiente():
    assert estados_de_turnos([r("dia", "pendiente"), r("dia", "confirmada")])[0] == "reservada"
    assert estados_de_turnos([r("dia", "confirmada"), r("dia", "pendiente")])[0] == "reservada"


def test_turno_nulo_cuenta_como_dia():
    assert estados_de_turnos([r(None, "confirmada")]) == ("reservada", "disponible")


def test_turnos_cubiertos():
    assert TURNOS == ("dia", "noche", "completo")
    assert turnos_cubiertos("dia") == {"dia"}
    assert turnos_cubiertos("noche") == {"noche"}
    assert turnos_cubiertos("completo") == {"dia", "noche"}


def test_validar_dia_ignora_la_noche():
    validar_turno_disponible("disponible", "reservada", "dia")
    validar_turno_disponible("reservada", "disponible", "noche")


def test_validar_mensajes():
    with pytest.raises(ValueError, match="^El turno día de esa fecha ya está tomado.$"):
        validar_turno_disponible("pendiente", "disponible", "dia")
    with pytest.raises(ValueError, match="^El turno noche de esa fecha ya está tomado.$"):
        validar_turno_disponible("disponible", "reservada", "noche")
    with pytest.raises(ValueError, match="^Esa fecha ya tiene un turno tomado; no se puede reservar completa.$"):
        validar_turno_disponible("disponible", "pendiente", "completo")
    validar_turno_disponible("disponible", "disponible", "completo")


def test_normalizar_turno():
    assert normalizar_turno(None) == "dia"
    assert normalizar_turno("") == "dia"
    assert normalizar_turno("noche") == "noche"
    with pytest.raises(ValueError, match="Turno inválido: tarde"):
        normalizar_turno("tarde")


def test_horarios():
    assert HORARIOS["dia"] == (time(11, 0), time(19, 0))
    assert HORARIOS["noche"] == (time(20, 30), time(4, 30))
    assert HORARIOS["completo"] == (time(11, 0), time(4, 30))


def test_aplicar_estados():
    fecha = SimpleNamespace(estado=None, estado_noche=None)
    aplicar_estados(fecha, [r("noche", "confirmada")])
    assert (fecha.estado, fecha.estado_noche) == ("disponible", "reservada")


# --- Reactivar una reserva cancelada (revisión final) ---
from app.turnos import validar_reactivacion  # noqa: E402


def test_reactivar_en_turno_tomado_por_otra_falla():
    otras = [r("noche", "confirmada"), r("completo", "cancelada")]
    with pytest.raises(ValueError, match="no se puede reservar completa"):
        validar_reactivacion(otras, "completo")
    with pytest.raises(ValueError, match="turno noche"):
        validar_reactivacion(otras, "noche")


def test_reactivar_en_turno_libre_se_permite():
    validar_reactivacion([r("noche", "confirmada"), r("dia", "archivada")], "dia")
    validar_reactivacion([], "completo")
