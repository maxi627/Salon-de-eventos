"""Datos que arman las rutas de reservas. Funciones puras para poder probarlas sin la app completa."""
from app.turnos import HORARIOS, NOMBRES


def datos_reserva_online(form, fecha_id, user_id) -> dict:
    """
    Datos de la reserva que un cliente pide desde el sitio. Por el sitio solo se reserva el turno día:
    el turno se fija acá aunque el formulario mande otro.
    """
    return {
        'fecha_id': int(fecha_id),
        'usuario_id': user_id,
        'comprobante_url': 'procesando...',
        'estado': 'pendiente',
        'turno': 'dia',
        'cantidad_personas': form.get('cantidad_personas', 40),
        # El horario lo define el turno día; no se aceptan horarios mandados desde el sitio
        'hora_inicio': None,
        'hora_fin': None,
    }


def horarios_del_contrato(reserva) -> dict:
    """Horario pactado para el contrato: el cargado en la reserva o, si falta, el de su turno."""
    turno = reserva.turno or 'dia'
    desde, hasta = HORARIOS[turno]
    inicio = reserva.hora_inicio or desde
    fin = reserva.hora_fin or hasta
    return {
        'hora_inicio': inicio.strftime('%H:%M'),
        'hora_fin': fin.strftime('%H:%M'),
        'turno_nombre': NOMBRES[turno],
    }
