import time
from contextlib import contextmanager

from app.extensions import cache, db, redis_client
from app.models import Fecha, Reserva
from app.repositories import ReservaRepository
from app.services.fecha_services import \
    FechaService  # Importamos el servicio de Fecha
from app.services.push_notification_service import PushNotificationService


class ReservaService:
    """
    Servicio para gestionar reservas con soporte de caché y bloqueos en Redis para concurrencia.
    """
    CACHE_TIMEOUT = 300  # Tiempo de expiración de caché en segundos
    REDIS_LOCK_TIMEOUT = 10  # Tiempo de bloqueo en Redis en segundos

    def __init__(self, repository=None):
        self.repository = repository or ReservaRepository()
        self.fecha_service = FechaService() # Instanciamos el servicio de fecha

    @contextmanager
    def redis_lock(self, reserva_id: int):
        """
        Context manager para gestionar el bloqueo de recursos en Redis.
        """
        lock_key = f"reserva_lock_{reserva_id}"
        lock_value = str(time.time())

        if redis_client.set(lock_key, lock_value, ex=self.REDIS_LOCK_TIMEOUT, nx=True):
            try:
                yield  # Permite la ejecución del bloque protegido
            finally:
                redis_client.delete(lock_key)
        else:
            raise Exception(f"El recurso está bloqueado para la reserva {reserva_id}.")

    def all(self) -> list[Reserva]:
        """
        Obtiene la lista de todas las reservas, con caché.
        """
        cached_reservas = cache.get('reservas')
        if cached_reservas is None:
            reservas = self.repository.get_all()
            if reservas:
                cache.set('reservas', reservas, timeout=self.CACHE_TIMEOUT)
            return reservas
        return cached_reservas

    def add(self, reserva: Reserva) -> Reserva:
        """
        Agrega una nueva reserva, verificando la disponibilidad de la fecha
        y actualizando su estado para que coincida con el de la reserva.
        """
        with self.fecha_service.redis_lock(reserva.fecha_id):
            
            fecha_a_reservar = self.fecha_service.find(reserva.fecha_id)

            if not fecha_a_reservar:
                raise Exception(f"La fecha con ID {reserva.fecha_id} no existe.")

            if fecha_a_reservar.estado != 'disponible':
                raise Exception(f"La fecha seleccionada ya no está disponible.")

            try:
                # Ahora el estado de la fecha depende del estado de la reserva
                if reserva.estado == 'confirmada':
                    fecha_a_reservar.estado = 'reservada'
                else:
                    fecha_a_reservar.estado = 'pendiente'
                
                db.session.add(reserva)
                db.session.commit()

                # --- INICIO DE NOTIFICACIÓN TELEGRAM ---
                try:
                    # Traemos al usuario para tener el nombre en el mensaje
                    # Asumiendo que reserva.usuario ya está cargado o se puede acceder
                    u = reserva.usuario 
                    nombre_cliente = f"{u.nombre} {u.apellido}" if u else "Nuevo Cliente"
                    
                    telegram = PushNotificationService()
                    mensaje_alerta = (
                        f"👤 *Cliente:* {nombre_cliente}\n"
                        f"📅 *Fecha:* {fecha_a_reservar.dia}\n"
                        f"📋 *Estado:* {reserva.estado.capitalize()}"
                    )
                    telegram.send_notification(mensaje_alerta, title="🆕 ¡Nueva Solicitud de Reserva!")
                except Exception as e:
                    # Solo printeamos para no romper el flujo del cliente si falla Telegram
                    print(f"Error al enviar notificación push: {e}")
                # --- FIN DE NOTIFICACIÓN ---

                # Lógica de caché existente...
                cache.set(f'reserva_{reserva.id}', reserva, timeout=self.CACHE_TIMEOUT)
                cache.delete('reservas')
                cache.set(f'fecha_{fecha_a_reservar.id}', fecha_a_reservar, timeout=self.CACHE_TIMEOUT)
                cache.delete('fechas')
                cache.delete('fechas_disponibles')
                cache.delete('todas_las_fechas')

                return reserva

            except Exception as e:
                db.session.rollback()
                raise e
    def update(self, reserva_id: int, updated_data: dict) -> Reserva:
        """
        Actualiza una reserva existente con nuevos datos.
        """
        with self.redis_lock(reserva_id):
            reserva_a_actualizar = self.repository.get_by_id(reserva_id)
            
            if not reserva_a_actualizar:
                raise Exception(f"Reserva con ID {reserva_id} no encontrada.")

            estado_anterior = reserva_a_actualizar.estado
            nuevo_estado = updated_data.get('estado')

            for key, value in updated_data.items():
                if hasattr(reserva_a_actualizar, key):
                    setattr(reserva_a_actualizar, key, value)
            
            # Comprobamos los estados para actualizar la fecha
            if nuevo_estado == 'confirmada' and estado_anterior != 'confirmada':
                reserva_a_actualizar.fecha.estado = 'reservada'
            elif nuevo_estado == 'cancelada' and estado_anterior != 'cancelada':
                reserva_a_actualizar.fecha.estado = 'disponible'
            elif nuevo_estado == 'pendiente' and estado_anterior != 'pendiente':
                reserva_a_actualizar.fecha.estado = 'pendiente'

            db.session.add(reserva_a_actualizar)
            if reserva_a_actualizar.fecha:
                db.session.add(reserva_a_actualizar.fecha)

            # Confirmamos los cambios en la BD. Aquí el objeto 'reserva_a_actualizar' expira.
            db.session.commit()

            # 🟢 SOLUCIÓN: Volvemos a traer la reserva "fresca" y completa desde la BD
            # Esto evita el error de "not bound to a Session" y asegura que la caché guarde el objeto sano.
            reserva_fresca = self.repository.get_by_id(reserva_id)

            cache.set(f'reserva_{reserva_id}', reserva_fresca, timeout=self.CACHE_TIMEOUT)
            cache.delete('reservas')
            
            # Invalidamos la caché de la fecha usando la reserva fresca
            if reserva_fresca and reserva_fresca.fecha_id:
                cache.delete(f'fecha_{reserva_fresca.fecha_id}')
            
            # Limpieza profunda de caché de fechas
            cache.delete('fechas')
            cache.delete('fechas_disponibles')
            cache.delete('todas_las_fechas')

            return reserva_fresca
    def delete(self, reserva_id: int) -> bool:
        """
        Archiva una reserva en lugar de eliminarla permanentemente (soft delete).
        Esto preserva el historial de pagos y la integridad de los datos.
        La fecha asociada a la reserva se libera para que esté disponible nuevamente.
        """
        with self.redis_lock(reserva_id):
            reserva_a_archivar = self.repository.get_by_id(reserva_id)

            if not reserva_a_archivar:
                return False

            try:
                # Cambiamos el estado a 'archivada' en lugar de eliminar
                reserva_a_archivar.estado = 'archivada'

                # Liberamos la fecha para que vuelva a estar disponible
                fecha_asociada = reserva_a_archivar.fecha
                if fecha_asociada:
                    fecha_asociada.estado = 'disponible'
                    cache.delete(f'fecha_{fecha_asociada.id}')
                    
                    # --- MEJORA: Limpieza profunda de caché de fechas ---
                    cache.delete('fechas')
                    cache.delete('fechas_disponibles')
                    cache.delete('todas_las_fechas')

                db.session.commit()

                # Invalidamos las cachés de la reserva
                cache.delete(f'reserva_{reserva_id}')
                cache.delete('reservas')

                return True

            except Exception as e:
                db.session.rollback()
                raise e

    def get_all_archived(self) -> list[Reserva]:
        """
        Obtiene la lista de todas las reservas archivadas, con caché.
        """
        cached_reservas = cache.get('reservas_archivadas')
        if cached_reservas is None:
            reservas = self.repository.get_all_archived()
            if reservas:
                cache.set('reservas_archivadas', reservas, timeout=self.CACHE_TIMEOUT)
            return reservas
        return cached_reservas

    def find(self, reserva_id: int) -> Reserva:
        """
        Busca una reserva por su ID, con caché.
        """
        cached_reserva = cache.get(f'reserva_{reserva_id}')
        if cached_reserva is None:
            reserva = self.repository.get_by_id(reserva_id)
            if reserva:
                cache.set(f'reserva_{reserva_id}', reserva, timeout=self.CACHE_TIMEOUT)
            return reserva
        return cached_reserva

    def recalcular_saldo(self, reserva_id: int):
        """
        Invalida la caché para forzar el recálculo del saldo_restante (propiedad dinámica).
        """
        cache.delete(f'reserva_{reserva_id}')
        cache.delete('reservas')
        
    def get_by_user_id(self, user_id: int) -> list[Reserva]:
        """
        Obtiene todas las reservas de un usuario.
        """
        return self.repository.get_by_user_id(user_id)