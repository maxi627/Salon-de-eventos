import os

import sentry_sdk
from flask import Flask
from sentry_sdk.integrations.flask import FlaskIntegration

from app.config import factory
from app.extensions import cache, db, jwt, limiter


def create_app(config_name=None):
    app = Flask(__name__)
    app.config.from_object(factory(config_name))

    
    sentry_dsn = os.getenv("SENTRY_DSN_BACKEND")
    if sentry_dsn:
        sentry_sdk.init(
            dsn=sentry_dsn,
            integrations=[FlaskIntegration()],
            traces_sample_rate=1.0
        )
    # --- FIN DEL CÓDIGO DE SENTRY ---

    # Inicialización de extensiones (sin cambios)
    db.init_app(app)
    cache.init_app(app)
    limiter.init_app(app)
    jwt.init_app(app)

    # Registro de Blueprints (sin cambios)
    from app.routes.administrador_resource import Administrador
    from app.routes.analytics_resource import Analytics
    from app.routes.auth_resource import Auth
    from app.routes.config_resource import Config
    from app.routes.fecha_resource import Fecha
    from app.routes.persona_resource import Persona
    from app.routes.reserva_resource import Reserva
    from app.routes.usuario_resource import Usuario
    
    app.register_blueprint(Administrador, url_prefix='/api/v1')
    app.register_blueprint(Usuario, url_prefix='/api/v1')
    app.register_blueprint(Fecha, url_prefix='/api/v1')
    app.register_blueprint(Reserva, url_prefix='/api/v1')
    app.register_blueprint(Persona, url_prefix='/api/v1')
    app.register_blueprint(Auth, url_prefix='/api/v1')
    app.register_blueprint(Config, url_prefix='/api/v1')
    app.register_blueprint(Analytics, url_prefix='/api/v1')
    
    return app