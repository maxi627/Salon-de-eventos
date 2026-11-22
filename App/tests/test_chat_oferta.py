from datetime import date
from types import SimpleNamespace



def _cargar_chatbot():
    # Se carga el archivo directamente: importar `app.services` trae todos los servicios, y el de
    # contratos depende de WeasyPrint/GTK, que no está fuera de Docker.
    import importlib.util
    from pathlib import Path

    archivo = Path(__file__).resolve().parents[1] / "services" / "chatbot_service.py"
    spec = importlib.util.spec_from_file_location("chatbot_service_en_test", archivo)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


_evaluar_fecha = _cargar_chatbot()._evaluar_fecha

HOY = date(2026, 11, 19)
SABADO = date(2026, 11, 28)


def _fecha(valor_estimado, valor_oferta=None, estado="disponible", estado_noche="disponible"):
    return SimpleNamespace(estado=estado, estado_noche=estado_noche, valor_estimado=valor_estimado, valor_oferta=valor_oferta)


def test_fecha_en_oferta_informa_el_precio_de_oferta_y_el_normal():
    r = _evaluar_fecha(SABADO, _fecha(180000, 130000), HOY)
    assert r["disponible"] is True
    assert r["precio_estimado_ars"] == 130000
    assert r["en_oferta"] is True
    assert r["precio_normal_ars"] == 180000


def test_fecha_sin_oferta_no_menciona_ofertas():
    r = _evaluar_fecha(SABADO, _fecha(180000), HOY)
    assert r["precio_estimado_ars"] == 180000
    assert "en_oferta" not in r and "precio_normal_ars" not in r


def test_fecha_sin_precio_ni_oferta():
    r = _evaluar_fecha(SABADO, _fecha(0), HOY)
    assert r["precio_estimado_ars"] is None


def test_oferta_sin_precio_normal():
    r = _evaluar_fecha(SABADO, _fecha(0, 90000), HOY)
    assert r["precio_estimado_ars"] == 90000
    assert r["en_oferta"] is True
    assert "precio_normal_ars" not in r


def test_fecha_reservada_con_oferta_guardada_no_la_ofrece():
    r = _evaluar_fecha(SABADO, _fecha(180000, 130000, estado="reservada"), HOY)
    assert r["disponible"] is False
    assert "en_oferta" not in r


# --- Turno noche ---

def test_dia_ocupado_noche_libre():
    r = _evaluar_fecha(SABADO, _fecha(180000, estado="reservada"), HOY)
    assert r["disponible"] is False
    assert r["noche_disponible"] is True


def test_noche_ocupada():
    r = _evaluar_fecha(SABADO, _fecha(180000, estado_noche="pendiente"), HOY)
    assert r["disponible"] is True
    assert r["noche_disponible"] is False


def test_fecha_sin_fila_tiene_noche_libre():
    r = _evaluar_fecha(SABADO, None, HOY)
    assert r["disponible"] is True and r["noche_disponible"] is True


def test_domingo_no_informa_noche():
    r = _evaluar_fecha(date(2026, 11, 29), None, HOY)
    assert r["disponible"] is False
    assert "noche_disponible" not in r


def test_fecha_pasada_no_informa_noche():
    assert "noche_disponible" not in _evaluar_fecha(date(2026, 11, 1), None, HOY)
