import ipaddress
import os
from functools import wraps

import requests
import sentry_sdk
from flask import jsonify, request

from app.utils.client_ip import get_client_ip

SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def _ip_valida(ip: str):
    try:
        return str(ipaddress.ip_address(ip))
    except ValueError:
        return None


def turnstile_required(fn):
    """
    Exige un token válido de Cloudflare Turnstile en la cabecera X-Turnstile-Token.
    Sin TURNSTILE_SECRET_KEY (desarrollo y tests) la verificación se omite; en producción
    la variable es obligatoria (ProductionConfig.init_app), así que nunca se saltea.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        secret = os.getenv("TURNSTILE_SECRET_KEY")
        if not secret:
            return fn(*args, **kwargs)

        token = request.headers.get("X-Turnstile-Token", "").strip()
        if not token:
            return jsonify(message="Completá la verificación de seguridad e intentá de nuevo."), 403

        datos = {"secret": secret, "response": token}
        ip = _ip_valida(get_client_ip())
        if ip:
            datos["remoteip"] = ip

        try:
            respuesta = requests.post(SITEVERIFY_URL, data=datos, timeout=5)
            valido = respuesta.json().get("success") is True
        except Exception as e:
            # Si Cloudflare no responde, se rechaza (falla cerrada)
            sentry_sdk.capture_exception(e)
            valido = False

        if not valido:
            return jsonify(message="No pudimos verificar que seas una persona. Recargá la página e intentá de nuevo."), 403
        return fn(*args, **kwargs)
    return wrapper
