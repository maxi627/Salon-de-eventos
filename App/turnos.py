"""
Turnos del salón: día (11 a 19) y noche (20:30 a 4:30 del día siguiente).

Cada reserva toma un turno ('dia', 'noche' o 'completo' = los dos). La fecha guarda el estado de cada
turno: `estado` para el día y `estado_noche` para la noche ('disponible', 'pendiente' o 'reservada').
Esos estados se recalculan siempre a partir de las reservas activas de la fecha, así cancelar o archivar
una reserva nunca libera un turno que tomó otra.
"""
from datetime import time

TURNOS = ("dia", "noche", "completo")

HORARIOS = {
    "dia": (time(11, 0), time(19, 0)),
    "noche": (time(20, 30), time(4, 30)),
    "completo": (time(11, 0), time(4, 30)),
}

NOMBRES = {"dia": "Día", "noche": "Noche", "completo": "Completo"}

_CUBIERTOS = {
    "dia": frozenset({"dia"}),
    "noche": frozenset({"noche"}),
    "completo": frozenset({"dia", "noche"}),
}

_INACTIVAS = ("cancelada", "archivada")

_MENSAJES_OCUPADO = {
    "dia": "El turno día de esa fecha ya está tomado.",
    "noche": "El turno noche de esa fecha ya está tomado.",
    "completo": "Esa fecha ya tiene un turno tomado; no se puede reservar completa.",
}


def normalizar_turno(valor) -> str:
    """'' o None = 'dia'. Cualquier otro valor fuera de TURNOS es un error."""
    if valor in (None, ""):
        return "dia"
    if valor not in TURNOS:
        raise ValueError(f"Turno inválido: {valor}")
    return valor


def turnos_cubiertos(turno: str) -> frozenset:
    return _CUBIERTOS[turno or "dia"]


def _estado_del_turno(reservas, turno: str) -> str:
    estados = {r.estado for r in reservas if turno in turnos_cubiertos(r.turno)}
    if "confirmada" in estados:
        return "reservada"
    if "pendiente" in estados:
        return "pendiente"
    return "disponible"


def estados_de_turnos(reservas) -> tuple:
    """(estado_dia, estado_noche) según las reservas activas (no canceladas ni archivadas)."""
    activas = [r for r in reservas if r.estado not in _INACTIVAS]
    return _estado_del_turno(activas, "dia"), _estado_del_turno(activas, "noche")


def aplicar_estados(fecha, reservas) -> None:
    fecha.estado, fecha.estado_noche = estados_de_turnos(reservas)


def validar_turno_disponible(estado_dia: str, estado_noche: str, turno: str) -> None:
    """Lanza ValueError si algún turno que cubre `turno` no está disponible."""
    actuales = {"dia": estado_dia, "noche": estado_noche}
    if any(actuales[t] != "disponible" for t in turnos_cubiertos(turno)):
        raise ValueError(_MENSAJES_OCUPADO[turno])
