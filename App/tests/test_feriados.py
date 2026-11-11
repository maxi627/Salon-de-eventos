from datetime import date

import pytest
from flask import Flask

from app.extensions import db
from app.feriados import parsear_feriados, sincronizar_feriados
from app.models import Feriado

DATOS_2026 = [
    {"fecha": "2026-05-25", "tipo": "inamovible", "nombre": "Día de la Revolución de Mayo"},
    {"fecha": "2026-06-15", "tipo": "trasladable", "nombre": "Paso a la Inmortalidad del General Güemes"},
    {"fecha": "2026-07-10", "tipo": "puente", "nombre": "Puente turístico no laborable"},
]


@pytest.fixture
def app_db(tmp_path):
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{tmp_path / 'feriados.db'}"
    db.init_app(app)
    with app.app_context():
        Feriado.__table__.create(db.engine)
        yield app


def _feriados():
    return [(f.fecha, f.nombre, f.tipo) for f in Feriado.query.order_by(Feriado.fecha).all()]


def test_parsear_convierte_fechas_y_descarta_lo_invalido():
    datos = DATOS_2026 + [
        {"fecha": "no-es-fecha", "tipo": "inamovible", "nombre": "Roto"},
        {"tipo": "inamovible", "nombre": "Sin fecha"},
        {"fecha": "2026-12-25", "nombre": "Navidad"},  # sin tipo: se acepta
    ]
    resultado = parsear_feriados(datos)
    assert [f["fecha"] for f in resultado] == [date(2026, 5, 25), date(2026, 6, 15), date(2026, 7, 10), date(2026, 12, 25)]
    assert resultado[2] == {"fecha": date(2026, 7, 10), "nombre": "Puente turístico no laborable", "tipo": "puente"}
    assert resultado[3]["tipo"] == ""


def test_parsear_tolera_una_respuesta_que_no_es_lista():
    assert parsear_feriados({"error": "algo"}) == []


def test_sincronizar_guarda_todos_los_tipos(app_db):
    resumen = sincronizar_feriados([2026], obtener=lambda anio: parsear_feriados(DATOS_2026))
    assert resumen == {2026: 3}
    assert [t for _, _, t in _feriados()] == ["inamovible", "trasladable", "puente"]


def test_sincronizar_actualiza_agrega_y_quita_los_que_ya_no_estan(app_db):
    sincronizar_feriados([2026], obtener=lambda anio: parsear_feriados(DATOS_2026))
    nuevos = [
        {"fecha": "2026-05-25", "tipo": "inamovible", "nombre": "Revolución de Mayo"},  # cambia el nombre
        {"fecha": "2026-06-17", "tipo": "trasladable", "nombre": "Güemes"},  # se trasladó
        {"fecha": "2026-07-10", "tipo": "puente", "nombre": "Puente turístico no laborable"},
        {"fecha": "2026-12-07", "tipo": "puente", "nombre": "Puente turístico no laborable"},  # decretado después
    ]
    sincronizar_feriados([2026], obtener=lambda anio: parsear_feriados(nuevos))
    assert [(f, n) for f, n, _ in _feriados()] == [
        (date(2026, 5, 25), "Revolución de Mayo"),
        (date(2026, 6, 17), "Güemes"),
        (date(2026, 7, 10), "Puente turístico no laborable"),
        (date(2026, 12, 7), "Puente turístico no laborable"),
    ]


def test_si_la_api_falla_se_conservan_los_feriados(app_db):
    sincronizar_feriados([2026], obtener=lambda anio: parsear_feriados(DATOS_2026))

    def falla(anio):
        raise ConnectionError("sin conexión")

    resumen = sincronizar_feriados([2026], obtener=falla)
    assert resumen == {2026: "error: sin conexión"}
    assert len(_feriados()) == 3


def test_una_respuesta_vacia_no_borra_el_año(app_db):
    sincronizar_feriados([2026], obtener=lambda anio: parsear_feriados(DATOS_2026))
    resumen = sincronizar_feriados([2026], obtener=lambda anio: [])
    assert resumen == {2026: "sin datos, se conservan los anteriores"}
    assert len(_feriados()) == 3


def test_cada_año_se_sincroniza_por_separado(app_db):
    datos = {
        2026: parsear_feriados(DATOS_2026),
        2027: parsear_feriados([{"fecha": "2027-01-01", "tipo": "inamovible", "nombre": "Año nuevo"}]),
    }
    assert sincronizar_feriados([2026, 2027], obtener=datos.get) == {2026: 3, 2027: 1}
    assert len(_feriados()) == 4
