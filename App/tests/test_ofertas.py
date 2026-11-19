from datetime import date, timedelta

import pytest

from app.ofertas import validar_oferta

HOY = date(2026, 11, 19)  # jueves
SABADO = date(2026, 11, 28)


def test_oferta_valida_devuelve_el_precio():
    assert validar_oferta(SABADO, "disponible", 180000, 130000, HOY) == 130000.0


def test_acepta_el_precio_como_texto():
    assert validar_oferta(SABADO, "disponible", 180000, "130000", HOY) == 130000.0


def test_sin_precio_normal_acepta_cualquier_oferta_positiva():
    assert validar_oferta(SABADO, "disponible", 0, 90000, HOY) == 90000.0


def test_hoy_se_puede():
    assert validar_oferta(HOY, "disponible", 150000, 100000, HOY) == 100000.0


@pytest.mark.parametrize("dia, mensaje", [
    (date(2026, 11, 29), "domingo"),
    (date(2026, 11, 18), "ya pasó"),
    (HOY + timedelta(days=91), "90 días"),
])
def test_rechaza_fechas_no_reservables(dia, mensaje):
    with pytest.raises(ValueError, match=mensaje):
        validar_oferta(dia, "disponible", 180000, 130000, HOY)


@pytest.mark.parametrize("estado", ["pendiente", "reservada"])
def test_rechaza_fechas_no_libres(estado):
    with pytest.raises(ValueError, match="libre"):
        validar_oferta(SABADO, estado, 180000, 130000, HOY)


@pytest.mark.parametrize("valor", [0, -5000, None, "", "abc", float("nan")])
def test_rechaza_precios_invalidos(valor):
    with pytest.raises(ValueError, match="mayor que 0"):
        validar_oferta(SABADO, "disponible", 180000, valor, HOY)


@pytest.mark.parametrize("valor", [180000, 200000])
def test_la_oferta_tiene_que_ser_menor_que_el_precio_normal(valor):
    with pytest.raises(ValueError, match="menor que el precio normal"):
        validar_oferta(SABADO, "disponible", 180000, valor, HOY)
