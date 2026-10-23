import os

import sentry_sdk
from flask import Flask
from flask_jwt_extended import get_jwt, verify_jwt_in_request
from sentry_sdk.integrations.flask import FlaskIntegration
from werkzeug.exceptions import HTTPException
from werkzeug.middleware.proxy_fix import ProxyFix
from app.config import factory
from app.extensions import cache, db, jwt, limiter

def create_app(config_name=None):
    app = Flask(__name__)
    # Sin argumento se usa FLASK_ENV (el Dockerfile define "production")
    config_class = factory(config_name or os.getenv("FLASK_ENV", "development"))
    app.config.from_object(config_class)
    config_class.init_app(app)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
    # Inicialización de Celery para vincularlo al contexto de Flask
    from app.celery_app import celery
    
    # Configuración de Sentry
    sentry_dsn = os.getenv("SENTRY_DSN_BACKEND")
    if sentry_dsn:
        sentry_sdk.init(
            dsn=sentry_dsn,
            integrations=[FlaskIntegration()],
            traces_sample_rate=0.2,
            send_default_pii=False
        )

    # Inicialización de extensiones
    db.init_app(app)
    cache.init_app(app)
    limiter.init_app(app)
    jwt.init_app(app)

    # Middleware de Sentry
    @app.before_request
    def set_sentry_user_context():
        try:
            verify_jwt_in_request(optional=True)
            claims = get_jwt()
            if claims and claims.get("sub"):
                # Sólo id y rol: no se envían correo ni nombre a Sentry (Ley 25.326)
                sentry_sdk.set_user({
                    "id": claims.get("sub"),
                    "role": claims.get("role")
                })
            else:
                sentry_sdk.set_user(None)
        except Exception:
            sentry_sdk.set_user(None)
    
    # Registro de Blueprints
    from app.routes.administrador_resource import Administrador
    from app.routes.analytics_resource import Analytics
    from app.routes.auth_resource import Auth
    from app.routes.chatbot_resource import ChatbotBP
    from app.routes.config_resource import Config
    from app.routes.fecha_resource import Fecha
    from app.routes.gasto_resource import GastoBP
    from app.routes.pago_resource import PagoBP
    from app.routes.persona_resource import Persona
    from app.routes.reserva_resource import Reserva
    from app.routes.test_notifications_resource import TestNotifications
    from app.routes.usuario_resource import Usuario
    
    app.register_blueprint(Administrador, url_prefix='/api/v1')
    app.register_blueprint(Usuario, url_prefix='/api/v1')
    app.register_blueprint(Fecha, url_prefix='/api/v1')
    app.register_blueprint(Reserva, url_prefix='/api/v1')
    app.register_blueprint(Persona, url_prefix='/api/v1')
    app.register_blueprint(Auth, url_prefix='/api/v1')
    app.register_blueprint(Config, url_prefix='/api/v1')
    app.register_blueprint(Analytics, url_prefix='/api/v1')
    app.register_blueprint(PagoBP, url_prefix='/api/v1')
    app.register_blueprint(TestNotifications, url_prefix='/api/v1')
    app.register_blueprint(GastoBP, url_prefix='/api/v1')
    app.register_blueprint(ChatbotBP, url_prefix='/api/v1')
    
    @app.errorhandler(413)
    def request_entity_too_large(error):
        return {"message": "El archivo supera el tamaño máximo permitido (10 MB).", "status_code": 413, "data": None}, 413

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        # Los errores HTTP (404, 405, 429...) se responden tal cual
        if isinstance(error, HTTPException):
            return error
        # Cualquier otro error no manejado: detalle a Sentry, mensaje genérico al cliente
        db.session.rollback()
        sentry_sdk.capture_exception(error)
        return {"message": "Error interno del servidor", "status_code": 500, "data": None}, 500

    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db.session.remove()
        
    return app