from datetime import date, timedelta

import pytest
from flask import Flask

from app.extensions import cache, db, limiter
from app.models import Feriado


def _cargar_ruta():
    # Se carga el archivo de la ruta directamente: importar `app.routes` trae todas las rutas, y
    # algunas dependen de librerías del sistema (WeasyPrint/GTK) que no están fuera de Docker.
    import importlib.util
    from pathlib import Path

    archivo = Path(__file__).resolve().parents[1] / "routes" / "feriado_resource.py"
    spec = importlib.util.spec_from_file_location("feriado_resource_en_test", archivo)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo.FeriadoBP


FeriadoBP = _cargar_ruta()


@pytest.fixture
def cliente(tmp_path):
    app = Flask(__name__)
    app.config.update(
        SQLALCHEMY_DATABASE_URI=f"sqlite:///{tmp_path / 'feriados.db'}",
        CACHE_TYPE="NullCache",
        RATELIMIT_ENABLED=False,  # el limitador global apunta a Redis; el límite se prueba en Docker
    )
    db.init_app(app)
    cache.init_app(app)
    limiter.init_app(app)
    app.register_blueprint(FeriadoBP, url_prefix="/api/v1")
    with app.app_context():
        Feriado.__table__.create(db.engine)
        hoy = date.today()
        db.session.add_all([
            Feriado(fecha=hoy - timedelta(days=10), nombre="Ya pasó", tipo="inamovible"),
            Feriado(fecha=hoy + timedelta(days=5), nombre="Próximo", tipo="trasladable"),
            Feriado(fecha=hoy + timedelta(days=40), nombre="Puente", tipo="puente"),
        ])
        db.session.commit()
        yield app.test_client()


def test_es_publica_y_trae_los_proximos(cliente):
    respuesta = cliente.get("/api/v1/feriado")
    assert respuesta.status_code == 200
    assert [f["nombre"] for f in respuesta.get_json()["data"]] == ["Próximo", "Puente"]


def test_cada_feriado_trae_fecha_nombre_y_tipo(cliente):
    feriado = cliente.get("/api/v1/feriado").get_json()["data"][0]
    assert set(feriado) == {"fecha", "nombre", "tipo"}
    assert feriado["fecha"] == (date.today() + timedelta(days=5)).isoformat()


def test_rechaza_una_fecha_invalida(cliente):
    assert cliente.get("/api/v1/feriado?desde=ayer").status_code == 400
