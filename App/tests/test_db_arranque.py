from flask import Flask
from flask_sqlalchemy import SQLAlchemy

from app.db_arranque import crear_tablas_sin_conexiones_abiertas


def _app_con_base(tmp_path):
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{tmp_path / 'prueba.db'}"
    db = SQLAlchemy()

    class Cosa(db.Model):
        id = db.Column(db.Integer, primary_key=True)

    db.init_app(app)
    return app, db


def test_crea_las_tablas(tmp_path):
    app, db = _app_con_base(tmp_path)
    with app.app_context():
        crear_tablas_sin_conexiones_abiertas(db)
        assert "cosa" in db.inspect(db.engine).get_table_names()


def test_no_deja_conexiones_en_el_pool_para_que_las_hereden_los_workers(tmp_path):
    # gunicorn crea los workers (fork) después de este paso: cualquier conexión que quede en el
    # pool del proceso principal la heredarían todos y compartirían el mismo socket de Postgres.
    app, db = _app_con_base(tmp_path)
    with app.app_context():
        crear_tablas_sin_conexiones_abiertas(db)
        assert db.engine.pool.checkedin() == 0
        assert db.engine.pool.checkedout() == 0
