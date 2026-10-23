from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request
from app import db

def _persona_activa_del_token():
    """
    Busca en la base a la persona del token. Devuelve None si no existe o está desactivada,
    así un token emitido antes de un cambio de rol o una baja deja de servir de inmediato.
    """
    from app.models import Persona
    try:
        persona = db.session.get(Persona, int(get_jwt_identity()))
    except (TypeError, ValueError):
        return None
    if not persona or not persona.activo:
        return None
    return persona

def admin_required():
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            # Verifica que hay un token válido
            verify_jwt_in_request()
            # Obtiene los "claims" (datos adicionales) del token
            claims = get_jwt()
            # El rol del token debe ser 'administrador' y seguir siéndolo en la base
            persona = _persona_activa_del_token() if claims.get("role") == "administrador" else None
            if persona and persona.tipo == "administrador":
                return fn(*args, **kwargs)
            else:
                # Si no, deniega el acceso
                return jsonify(message="¡Acceso solo para administradores!"), 403
        return decorator
    return wrapper

def active_user_required():
    """Exige un token válido de una persona que siga existiendo y esté activa."""
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            if not _persona_activa_del_token():
                return jsonify(message="Tu sesión ya no es válida. Iniciá sesión nuevamente."), 401
            return fn(*args, **kwargs)
        return decorator
    return wrapper

def transactional(f):
    """
    Decorador que envuelve la función en una transacción de base de datos.
    Hace commit() si todo sale bien, o rollback() si hay cualquier excepción.
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            # Ejecuta la función del servicio
            result = f(*args, **kwargs)
            db.session.commit()
            return result
        except Exception as e:
            db.session.rollback()
            # Lanzamos el error hacia arriba para que la ruta lo capture y envíe el status 500
            raise e 
    return wrapper