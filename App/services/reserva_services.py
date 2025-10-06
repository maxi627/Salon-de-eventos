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
        y actualizando su estado para que coincida con el de la reserva.
        """
        with self.fecha_service.redis_lock(reserva.fecha_id):
            
            fecha_a_reservar = self.fecha_service.find(reserva.fecha_id)

            if not fecha_a_reservar:
                raise Exception(f"La fecha con ID {reserva.fecha_id} no existe.")

            if fecha_a_reservar.estado != 'disponible':
                raise Exception(f"La fecha seleccionada ya no está disponible.")

            try:
                # --- INICIO DE LA MODIFICACIÓN ---
                # Ahora el estado de la fecha depende del estado de la reserva
                if reserva.estado == 'confirmada':
                    fecha_a_reservar.estado = 'reservada'
                else: # Si es 'pendiente' o cualquier otro estado inicial
                    fecha_a_reservar.estado = 'pendiente'
                # --- FIN DE LA MODIFICACIÓN ---
                
                db.session.add(reserva)
                db.session.commit()

                cache.set(f'reserva_{reserva.id}', reserva, timeout=self.CACHE_TIMEOUT)
                cache.delete('reservas')
                
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

            estado_anterior = reserva_a_actualizar.estado
            nuevo_estado = updated_data.get('estado')

            for key, value in updated_data.items():
                if hasattr(reserva_a_actualizar, key):
                    setattr(reserva_a_actualizar, key, value)
            
            # --- INICIO DE LA MODIFICACIÓN ---
            # Comprobamos el nuevo estado para actualizar la fecha asociada.
            if nuevo_estado == 'confirmada' and estado_anterior != 'confirmada':
                reserva_a_actualizar.fecha.estado = 'reservada'
            elif nuevo_estado == 'cancelada' and estado_anterior != 'cancelada':
                # Si la reserva se cancela, la fecha vuelve a estar disponible.
                reserva_a_actualizar.fecha.estado = 'disponible'
            # --- FIN DE LA MODIFICACIÓN ---

            db.session.commit()

            cache.set(f'reserva_{reserva_id}', reserva_a_actualizar, timeout=self.CACHE_TIMEOUT)
            cache.delete('reservas')
            # Invalidamos la caché de la fecha para que se muestre el nuevo estado en el calendario.
            cache.delete(f'fecha_{reserva_a_actualizar.fecha_id}')
            cache.delete('fechas')

            return reserva_a_actualizar

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
                    cache.delete('fechas')

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
    
    def get_by_user_id(self, user_id: int) -> list[Reserva]:
        """
        Obtiene todas las reservas de un usuario.
        """
        return self.repository.get_by_user_id(user_id)