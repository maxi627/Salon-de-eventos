import time
from contextlib import contextmanager

from app.extensions import cache, db, redis_client
from app.models import Reserva
from app.repositories import ReservaRepository
from app.services.fecha_services import FechaService


class ReservaService:
    """
    Servicio para gestionar reservas con soporte de caché y bloqueos en Redis 
    para garantizar la integridad en entornos concurrentes.
    """
    CACHE_TIMEOUT = 300
    REDIS_LOCK_TIMEOUT = 10

    def __init__(self, repository=None):
        self.repository = repository or ReservaRepository()
        self.fecha_service = FechaService()

    @contextmanager
    def redis_lock(self, id_entidad: int, tipo: str = "reserva"):
        """
        Context manager para gestionar bloqueos en Redis.
        """
        lock_key = f"{tipo}_lock_{id_entidad}"
        lock_value = str(time.time())

        if redis_client.set(lock_key, lock_value, ex=self.REDIS_LOCK_TIMEOUT, nx=True):
            try:
                yield
            finally:
                redis_client.delete(lock_key)
        else:
            raise Exception(f"El recurso ({tipo} {id_entidad}) está temporalmente bloqueado. Reintente.")

    def all(self) -> list[Reserva]:
        """
        Obtiene todas las reservas no archivadas con soporte de caché.
        """
        cached_data = cache.get('reservas')
        if cached_data is None:
            reservas = self.repository.get_all()
            cache.set('reservas', reservas, timeout=self.CACHE_TIMEOUT)
            return reservas
        return cached_data

    def find(self, reserva_id: int) -> Reserva:
        """
        Busca una reserva por ID, priorizando la caché.
        """
        cached_reserva = cache.get(f'reserva_{reserva_id}')
        if cached_reserva is None:
            reserva = self.repository.get_by_id(reserva_id)
            if reserva:
                cache.set(f'reserva_{reserva_id}', reserva, timeout=self.CACHE_TIMEOUT)
            return reserva
        return cached_reserva

    def add(self, reserva: Reserva) -> Reserva:
        """
        Crea una reserva y sincroniza el estado de la fecha.
        Utiliza el bloqueo de fecha para evitar reservas duplicadas.
        """
        with self.fecha_service.redis_lock(reserva.fecha_id):
            # IMPORTANTE: Obtener la fecha del repositorio para que esté en la sesión de DB
            fecha_entidad = self.fecha_service.repository.get_by_id(reserva.fecha_id)

            if not fecha_entidad:
                raise Exception(f"La fecha ID {reserva.fecha_id} no existe.")

            if fecha_entidad.estado != 'disponible':
                raise Exception("Lo sentimos, esta fecha ya ha sido seleccionada por otro usuario.")

            try:
                # Sincronizar estado de la fecha
                if reserva.estado == 'confirmada':
                    fecha_entidad.estado = 'reservada'
                else:
                    fecha_entidad.estado = 'pendiente'
                
                # Persistencia atómica
                db.session.add(reserva)
                db.session.commit()

                # Invalida cachés
                cache.delete('reservas')
                cache.delete(f'fecha_{fecha_entidad.id}')
                cache.delete('fechas')

                return reserva

            except Exception as e:
                db.session.rollback()
                raise e

    def update(self, reserva_id: int, updated_data: dict) -> Reserva:
        """
        Actualiza los datos de una reserva y sincroniza estados de fecha si es necesario.
        """
        with self.redis_lock(reserva_id):
            # Obtener de DB para asegurar que el objeto sea trackeable
            reserva = self.repository.get_by_id(reserva_id)
            if not reserva:
                raise Exception(f"Reserva ID {reserva_id} no encontrada.")

            estado_anterior = reserva.estado

            # Actualización dinámica de campos
            for key, value in updated_data.items():
                if hasattr(reserva, key):
                    setattr(reserva, key, value)
            
            nuevo_estado = reserva.estado

            # Lógica de estados cruzados
            if nuevo_estado == 'confirmada' and estado_anterior != 'confirmada':
                reserva.fecha.estado = 'reservada'
            elif nuevo_estado == 'cancelada' and estado_anterior != 'cancelada':
                reserva.fecha.estado = 'disponible'

            try:
                db.session.commit()

                # Limpieza de caché
                cache.delete(f'reserva_{reserva_id}')
                cache.delete('reservas')
                cache.delete(f'fecha_{reserva.fecha_id}')
                cache.delete('fechas')

                return reserva
            except Exception as e:
                db.session.rollback()
                raise e

    def delete(self, reserva_id: int) -> bool:
        """
        Realiza un archivado (soft delete) y libera la fecha asociada.
        """
        with self.redis_lock(reserva_id):
            reserva = self.repository.get_by_id(reserva_id)
            if not reserva:
                return False

            try:
                reserva.estado = 'archivada'
                if reserva.fecha:
                    reserva.fecha.estado = 'disponible'
                    cache.delete(f'fecha_{reserva.fecha_id}')

                db.session.commit()

                cache.delete(f'reserva_{reserva_id}')
                cache.delete('reservas')
                cache.delete('fechas')
                return True
            except Exception as e:
                db.session.rollback()
                raise e

    def get_by_user_id(self, user_id: int) -> list[Reserva]:
        """
        Obtiene el historial de reservas de un usuario específico.
        """
        return self.repository.get_by_user_id(user_id)

    def get_all_archived(self) -> list[Reserva]:
        """
        Obtiene las reservas archivadas para el panel de administración.
        """
        return self.repository.get_all_archived()