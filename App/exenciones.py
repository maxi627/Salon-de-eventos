from flask_jwt_extended import get_jwt, verify_jwt_in_request


def es_administrador_del_token():
    """
    Para `exempt_when` del limitador: True si el pedido trae un token válido de administrador.

    Las rutas que usa el editor de precios del panel (por ejemplo, la actualización masiva) hacen
    decenas de pedidos seguidos y chocaban contra el límite por minuto. El rol viene firmado
    dentro del token; la ruta igual vuelve a verificar los permisos con sus propios decoradores.
    Sin token, o con uno inválido o vencido, el límite se aplica como siempre.
    """
    try:
        verify_jwt_in_request(optional=True)
    except Exception:
        return False
    return get_jwt().get("role") == "administrador"
