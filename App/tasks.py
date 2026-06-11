import sentry_sdk
from datetime import datetime, timedelta
from celery import shared_task

from app.extensions import db, cache
from app.models import Reserva, Fecha
from app.services.push_notification_service import PushNotificationService


@shared_task
def check_pending_reservations():
    """
    Busca reservas pendientes y envía una notificación si encuentra alguna.
    """
    pending_reservas = Reserva.query.filter_by(estado='pendiente').count()
    
    if pending_reservas > 0:
        push_service = PushNotificationService()
        message = f"Tienes {pending_reservas} reserva(s) pendiente(s) de aprobación."
        push_service.send_notification(message, title="Reservas Pendientes")
        print(f"Tarea 'check_pending_reservations' ejecutada: {pending_reservas} pendientes encontradas.")


@shared_task
def check_upcoming_reservations():
    """
    Busca reservas confirmadas para los próximos días y envía un recordatorio.
    """
    today = datetime.utcnow().date()
    
    # Buscamos reservas para mañana
    upcoming_reservas = Reserva.query.join(Reserva.fecha).filter(
        Reserva.estado == 'confirmada',
        Reserva.fecha.has(dia=today + timedelta(days=1))
    ).all()
    
    if upcoming_reservas:
        push_service = PushNotificationService()
        for reserva in upcoming_reservas:
            user = reserva.usuario
            event_date = reserva.fecha.dia.strftime('%d/%m/%Y')
            message = f"Recordatorio: Mañana es el evento de {user.nombre} {user.apellido} ({event_date})."
            push_service.send_notification(message, title="Evento Próximo")
            print(f"Tarea 'check_upcoming_reservations' ejecutada: Notificación enviada para la reserva de {user.nombre}.")


@shared_task
def procesar_reserva_background(reserva_id: int):
    """
    Tarea en segundo plano: Actualiza calendarios, cachés y notifica por Telegram.
    """
    try:
        # 1. Buscamos la reserva en la base de datos
        reserva = db.session.get(Reserva, reserva_id)
        if not reserva:
            return

        # 2. Actualizamos el estado de la fecha en el calendario a 'reservada'
        fecha = db.session.get(Fecha, reserva.fecha_id)
        if fecha:
            fecha.estado = 'reservada'
            db.session.add(fecha)

        # 3. Guardamos los cambios
        db.session.commit()

        # 4. Destruimos la caché para que el calendario de React se actualice al instante
        cache.delete('fechas')
        cache.delete(f'fecha_{fecha.id}')
        cache.delete('todas_las_fechas')
        cache.delete('fechas_all')

        # 5. Enviamos la notificación
        try:
            u = reserva.usuario
            nombre_cliente = f"{u.nombre} {u.apellido}" if u else "Nuevo Cliente"
            telegram = PushNotificationService()
            mensaje = f"👤 *Cliente:* {nombre_cliente}\n📅 *Fecha:* {fecha.dia}\n✅ *Reserva solicitada y agendada exitosamente*"
            telegram.send_notification(mensaje, title="🆕 ¡Nueva Reserva!")
        except Exception as tel_err:
            sentry_sdk.capture_exception(tel_err)

    except Exception as e:
        db.session.rollback()
        sentry_sdk.capture_exception(e)