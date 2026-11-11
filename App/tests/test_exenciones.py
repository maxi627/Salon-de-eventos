from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from app.exenciones import es_administrador_del_token


def _app_con_limite():
    app = Flask(__name__)
    app.config["JWT_SECRET_KEY"] = "clave-de-prueba-de-al-menos-32-caracteres"
    JWTManager(app)
    limiter = Limiter(get_remote_address, app=app, storage_uri="memory://")

    @app.route("/limitada")
    @limiter.limit("2 per minute", exempt_when=es_administrador_del_token)
    def limitada():
        return "ok"

    return app


def _token(app, rol):
    with app.app_context():
        return create_access_token(identity="1", additional_claims={"role": rol})


def _estados(cliente, cantidad, token=None):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    return [cliente.get("/limitada", headers=headers).status_code for _ in range(cantidad)]


def test_un_administrador_no_tiene_limite():
    app = _app_con_limite()
    assert _estados(app.test_client(), 5, _token(app, "administrador")) == [200] * 5


def test_un_cliente_sigue_limitado():
    app = _app_con_limite()
    assert _estados(app.test_client(), 3, _token(app, "usuario")) == [200, 200, 429]


def test_sin_sesion_sigue_limitado():
    app = _app_con_limite()
    assert _estados(app.test_client(), 3) == [200, 200, 429]


def test_un_token_invalido_no_exime():
    app = _app_con_limite()
    assert _estados(app.test_client(), 3, "token.falso.invalido") == [200, 200, 429]
