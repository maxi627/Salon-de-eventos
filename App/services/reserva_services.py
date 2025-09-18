import time
from contextlib import contextmanager

from app.extensions import cache, db, redis_client
from app.models import Fecha, Reserva
from app.repositories import ReservaRepository
from app.services.fecha_services import \
    FechaService  # Importamos el servicio de Fecha


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
        y actualizando su estado a 'pendiente'.
        """
        with self.fecha_service.redis_lock(reserva.fecha_id):
            
            fecha_a_reservar = self.fecha_service.find(reserva.fecha_id)

            if not fecha_a_reservar:
                raise Exception(f"La fecha con ID {reserva.fecha_id} no existe.")

            if fecha_a_reservar.estado != 'disponible':
                raise Exception(f"La fecha seleccionada ya no está disponible.")

            try:
                fecha_a_reservar.estado = 'pendiente'
                db.session.add(reserva)
                db.session.commit()

                cache.set(f'reserva_{reserva.id}', reserva, timeout=self.CACHE_TIMEOUT)
                cache.delete('reservas')
                
                # Actualizamos la caché de la fecha modificada
                cache.set(f'fecha_{fecha_a_reservar.id}', fecha_a_reservar, timeout=self.CACHE_TIMEOUT)
                cache.delete('fechas')

                return reserva

            except Exception as e:
                db.session.rollback()
                raise e

    def update(self, reserva_id: int, updated_data: dict) -> Reserva:
        """
        Actualiza una reserva existente con nuevos datos.
        """
        with self.redis_lock(reserva_id):
            reserva_a_actualizar = self.find(reserva_id)
            if not reserva_a_actualizar:
                raise Exception(f"Reserva con ID {reserva_id} no encontrada.")

            for key, value in updated_data.items():
                if hasattr(reserva_a_actualizar, key):
                    setattr(reserva_a_actualizar, key, value)
            
            if updated_data.get('estado') == 'confirmada':
                reserva_a_actualizar.fecha.estado = 'reservada'

            db.session.commit()

            cache.set(f'reserva_{reserva_id}', reserva_a_actualizar, timeout=self.CACHE_TIMEOUT)
            cache.delete('reservas')
            cache.delete(f'fecha_{reserva_a_actualizar.fecha_id}')
            cache.delete('fechas')

            return reserva_a_actualizar

    def delete(self, reserva_id: int) -> bool:
        """
        Elimina una reserva y restablece el estado de su fecha a 'disponible'.
        """
        with self.redis_lock(reserva_id):
            reserva_a_eliminar = self.repository.get_by_id(reserva_id)

            if not reserva_a_eliminar:
                return False

            try:
                fecha_asociada = reserva_a_eliminar.fecha
                if fecha_asociada:
                    fecha_asociada.estado = 'disponible'

                db.session.delete(reserva_a_eliminar)
                db.session.commit()

                # --- ESTA ES LA CORRECCIÓN CLAVE ---
                # Invalidamos todas las cachés relevantes, incluyendo la de la fecha específica.
                cache.delete(f'reserva_{reserva_id}')
                cache.delete('reservas')
                if fecha_asociada:
                    cache.delete(f'fecha_{fecha_asociada.id}')
                    cache.delete('fechas') # Y la lista general de fechas
                
                return True

            except Exception as e:
                db.session.rollback()
                raise e

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