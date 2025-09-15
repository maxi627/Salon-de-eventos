import time
from contextlib import contextmanager

from app import (cache, db,  # Se asume que redis_client está configurado
                 redis_client)
from app.models import Reserva
from app.repositories import ReservaRepository


class ReservaService:
    """
    Servicio para gestionar reservas con soporte de caché y bloqueos en Redis para concurrencia.
    """
    CACHE_TIMEOUT = 300  # Tiempo de expiración de caché en segundos
    REDIS_LOCK_TIMEOUT = 10  # Tiempo de bloqueo en Redis en segundos

    def __init__(self, repository=None):
        self.repository = repository or ReservaRepository()

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
        Agrega una nueva reserva y actualiza la caché.
        """
        new_reserva = self.repository.add(reserva)
        cache.set(f'reserva_{new_reserva.id}', new_reserva, timeout=self.CACHE_TIMEOUT)
        cache.delete('reservas')
        return new_reserva

    def update(self, reserva_id: int, updated_reserva: Reserva) -> Reserva:
        """
        Actualiza una reserva existente.
        :param reserva_id: ID de la reserva a actualizar.
        :param updated_reserva: Datos de la reserva actualizados.
        :return: Objeto Reserva actualizado.
        """
        with self.redis_lock(reserva_id):
            existing_reserva = self.find(reserva_id)
            if not existing_reserva:
                raise Exception(f"Reserva con ID {reserva_id} no encontrada.")

            # --- CORREGIDO ---
            # Actualizar los atributos del objeto existente
            existing_reserva.estado = updated_reserva.estado
            existing_reserva.fecha_vencimiento = updated_reserva.fecha_vencimiento
            
            # Guardar los cambios en la base de datos
            db.session.commit()
            # --- FIN DE LA CORRECCIÓN ---

            # Actualizar caché
            cache.set(f'reserva_{reserva_id}', existing_reserva, timeout=self.CACHE_TIMEOUT)
            cache.delete('reservas')  # Invalida la lista de reservas en caché

            return existing_reserva

    def delete(self, reserva_id: int) -> bool:
        """
        Elimina una reserva por su ID y actualiza la caché.
        """
        with self.redis_lock(reserva_id):
            deleted = self.repository.delete(reserva_id)
            if deleted:
                cache.delete(f'reserva_{reserva_id}')
                cache.delete('reservas')
            return deleted

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