import os

from flask import request


def get_client_ip() -> str:
    """
    IP real del cliente.

    Detrás de Cloudflare, request.remote_addr es la IP del borde de Cloudflare; la del
    visitante llega en la cabecera CF-Connecting-IP. Esa cabecera sólo es confiable si el
    origen acepta conexiones exclusivamente desde Cloudflare (middleware cloudflare-only
    de Traefik); si no, cualquiera podría falsificarla. Por eso se activa explícitamente
    con TRUST_CLOUDFLARE_IP_HEADER=true junto con CLOUDFLARE_ORIGIN_LOCK.
    """
    if os.getenv("TRUST_CLOUDFLARE_IP_HEADER", "").lower() == "true":
        cf_ip = request.headers.get("CF-Connecting-IP", "").strip()
        if cf_ip:
            return cf_ip
    return request.remote_addr or "IP Desconocida"
