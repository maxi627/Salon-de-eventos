from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import inspect, text

from app.db_arranque import agregar_columnas_faltantes, crear_tablas_sin_conexiones_abiertas


def _app(tmp_path):
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{tmp_path / 'prueba.db'}"
    db = SQLAlchemy()
    db.init_app(app)
    return app, db


def _columnas(db, tabla):
    return {c["name"] for c in inspect(db.engine).get_columns(tabla)}


def test_agrega_valor_oferta_a_una_tabla_fecha_vieja(tmp_path):
    app, db = _app(tmp_path)
    with app.app_context():
        with db.engine.begin() as conexion:
            conexion.execute(text(
                "CREATE TABLE fecha (id INTEGER PRIMARY KEY, dia DATE NOT NULL, estado VARCHAR(20) NOT NULL, "
                "valor_estimado FLOAT NOT NULL, usuario_id INTEGER)"
            ))
            conexion.execute(text("INSERT INTO fecha (dia, estado, valor_estimado) VALUES ('2026-11-28', 'disponible', 180000)"))

        assert agregar_columnas_faltantes(db) == ["fecha.valor_oferta"]
        assert "valor_oferta" in _columnas(db, "fecha")
        # los datos existentes siguen ahí, con la oferta vacía
        with db.engine.connect() as conexion:
            assert conexion.execute(text("SELECT valor_estimado, valor_oferta FROM fecha")).one() == (180000, None)


def test_es_idempotente(tmp_path):
    app, db = _app(tmp_path)
    with app.app_context():
        with db.engine.begin() as conexion:
            conexion.execute(text("CREATE TABLE fecha (id INTEGER PRIMARY KEY, dia DATE NOT NULL)"))
        agregar_columnas_faltantes(db)
        assert agregar_columnas_faltantes(db) == []


def test_sin_tabla_fecha_no_hace_nada(tmp_path):
    app, db = _app(tmp_path)
    with app.app_context():
        assert agregar_columnas_faltantes(db) == []


def test_el_arranque_agrega_la_columna_y_no_deja_conexiones(tmp_path):
    app, db = _app(tmp_path)
    with app.app_context():
        with db.engine.begin() as conexion:
            conexion.execute(text("CREATE TABLE fecha (id INTEGER PRIMARY KEY, dia DATE NOT NULL)"))
        crear_tablas_sin_conexiones_abiertas(db)
        assert db.engine.pool.checkedin() == 0
        assert "valor_oferta" in _columnas(db, "fecha")
