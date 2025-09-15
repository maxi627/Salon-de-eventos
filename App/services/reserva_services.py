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

    # --- MODIFICADO ---
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

    # --- MÉTODO 'ADD' COMPLETAMENTE MODIFICADO CON LA LÓGICA DE NEGOCIO ---
    def add(self, reserva: Reserva) -> Reserva:
        """
        Agrega una nueva reserva, verificando la disponibilidad de la fecha
        y actualizando su estado a 'reservada'.
        """
        # Usamos el lock del servicio de fecha para bloquear la fecha específica
        with self.fecha_service.redis_lock(reserva.fecha_id):
            
            # 1. Buscar la fecha que se quiere reservar
            fecha_a_reservar = self.fecha_service.find(reserva.fecha_id)

            # 2. Validar que la fecha exista y esté disponible
            if not fecha_a_reservar:
                raise Exception(f"La fecha con ID {reserva.fecha_id} no existe.")

            if fecha_a_reservar.estado != 'disponible':
                raise Exception(f"La fecha seleccionada ya no está disponible.")

            try:
                # 3. Actualizar el estado de la fecha a 'reservada'
                fecha_a_reservar.estado = 'reservada'
                
                # 4. Agregar la reserva y la fecha actualizada a la sesión
                db.session.add(reserva)
                db.session.add(fecha_a_reservar)

                # 5. Guardar ambos cambios en la base de datos en una sola transacción
                db.session.commit()

                # 6. Actualizar la caché para la nueva reserva y la fecha modificada
                cache.set(f'reserva_{reserva.id}', reserva, timeout=self.CACHE_TIMEOUT)
                cache.delete('reservas')
                
                cache.set(f'fecha_{fecha_a_reservar.id}', fecha_a_reservar, timeout=self.CACHE_TIMEOUT)
                cache.delete('fechas')

                return reserva

            except Exception as e:
                # Si ocurre cualquier error, revertimos todos los cambios
                db.session.rollback()
                raise e

    def update(self, reserva_id: int, updated_reserva: Reserva) -> Reserva:
        """
        Actualiza una reserva existente.
        """
        with self.redis_lock(reserva_id):
            existing_reserva = self.find(reserva_id)
            if not existing_reserva:
                raise Exception(f"Reserva con ID {reserva_id} no encontrada.")

            existing_reserva.estado = updated_reserva.estado
            existing_reserva.fecha_vencimiento = updated_reserva.fecha_vencimiento
            
            db.session.commit()

            cache.set(f'reserva_{reserva_id}', existing_reserva, timeout=self.CACHE_TIMEOUT)
            cache.delete('reservas')

            return existing_reserva

    def delete(self, reserva_id: int) -> bool:
        """
        Elimina una reserva por su ID y actualiza la caché.
        """
        with self.redis_lock(reserva_id):
            # Nota: Considerar qué pasa con la fecha si se elimina una reserva.
            # ¿Debería volver a estar 'disponible'?
            # Por ahora, solo elimina la reserva.
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