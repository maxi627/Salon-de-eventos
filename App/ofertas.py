"""Reglas de las fechas en oferta (ver docs/superpowers/specs/2026-11-19-fechas-en-oferta-design.md)."""
import math
from datetime import timedelta

DIAS_MAXIMOS = 90  # igual que el calendario público


def validar_oferta(dia, estado, valor_estimado, valor_oferta, hoy):
    """
    Devuelve el precio de oferta como float si se puede poner en oferta esa fecha; si no, lanza
    ValueError con el motivo. Solo fechas reservables (libres, no domingo, de hoy a 90 días) y un
    precio mayor que 0 y menor que el precio normal (si la fecha tiene uno).
    """
    if dia < hoy:
        raise ValueError("La fecha ya pasó.")
    if dia > hoy + timedelta(days=DIAS_MAXIMOS):
        raise ValueError(f"Solo se pueden poner en oferta fechas dentro de los próximos {DIAS_MAXIMOS} días.")
    if dia.weekday() == 6:
        raise ValueError("Los domingos no se alquilan.")
    if estado != "disponible":
        raise ValueError("Solo se puede poner en oferta una fecha libre.")

    try:
        precio = float(valor_oferta)
    except (TypeError, ValueError):
        precio = None
    if precio is None or math.isnan(precio) or precio <= 0:
        raise ValueError("El precio de oferta tiene que ser un número mayor que 0.")

    normal = float(valor_estimado or 0)
    if normal > 0 and precio >= normal:
        raise ValueError(f"La oferta tiene que ser menor que el precio normal (${normal:,.0f}).".replace(",", "."))
    return precio
