"""
Feriados nacionales de Argentina, tomados de la API pública de ArgentinaDatos.

Trae los tres tipos (inamovible, trasladable y puente turístico), con los trasladables ya
movidos al día que corresponde. Los puentes se decretan durante el año, por eso una tarea
de Celery vuelve a sincronizar una vez por semana (ver app/tasks.py y app/celery_app.py).
"""
from datetime import date

import requests

from app.extensions import db
from app.models import Feriado

API_FERIADOS = "https://api.argentinadatos.com/v1/feriados/{anio}"


def parsear_feriados(datos):
    """Convierte la respuesta de la API en [{fecha: date, nombre, tipo}] y descarta lo inválido."""
    if not isinstance(datos, list):
        return []
    feriados = []
    for item in datos:
        try:
            fecha = date.fromisoformat(str(item["fecha"]))
        except (KeyError, TypeError, ValueError):
            continue
        nombre = str(item.get("nombre") or "Feriado").strip()[:200]
        tipo = str(item.get("tipo") or "").strip()[:30]
        feriados.append({"fecha": fecha, "nombre": nombre, "tipo": tipo})
    return sorted(feriados, key=lambda f: f["fecha"])


def obtener_feriados(anio):
    respuesta = requests.get(API_FERIADOS.format(anio=anio), timeout=10)
    respuesta.raise_for_status()
    return parsear_feriados(respuesta.json())


def sincronizar_feriados(anios, obtener=obtener_feriados):
    """
    Deja la tabla `feriado` igual a lo que informa la API para cada año: agrega los nuevos,
    actualiza nombre o tipo y quita los que ya no están (por ejemplo, un trasladable que cambió
    de día). Si la API falla o no trae datos para un año, ese año no se toca.
    Devuelve un resumen por año: cantidad de feriados o el motivo por el que no se actualizó.
    """
    resumen = {}
    for anio in anios:
        try:
            nuevos = obtener(anio)
        except Exception as e:
            resumen[anio] = f"error: {e}"
            continue
        if not nuevos:
            resumen[anio] = "sin datos, se conservan los anteriores"
            continue

        por_fecha = {f["fecha"]: f for f in nuevos}
        existentes = Feriado.query.filter(Feriado.fecha >= date(anio, 1, 1), Feriado.fecha <= date(anio, 12, 31)).all()
        for feriado in existentes:
            dato = por_fecha.pop(feriado.fecha, None)
            if dato is None:
                db.session.delete(feriado)
            else:
                feriado.nombre, feriado.tipo = dato["nombre"], dato["tipo"]
        for dato in por_fecha.values():
            db.session.add(Feriado(fecha=dato["fecha"], nombre=dato["nombre"], tipo=dato["tipo"]))
        db.session.commit()
        resumen[anio] = len(nuevos)
    return resumen
