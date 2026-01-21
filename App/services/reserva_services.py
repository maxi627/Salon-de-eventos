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

    # --- NUEVO MÉTODO CENTRAL PARA EL PROBLEMA DE SALDOS ---
# --- VERSIÓN CORREGIDA PARA PROPIEDADES DINÁMICAS ---
    def recalcular_saldo(self, reserva_id: int):
        """
        Como 'saldo_restante' es una @property en el modelo, no se guarda en la DB.
        Este método solo necesita invalidar la caché para que, al volver a leer la reserva,
        se ejecute el cálculo automático con los nuevos pagos.
        """
        # Solo limpiamos la memoria para obligar a recalcular
        cache.delete(f'reserva_{reserva_id}')
        cache.delete('reservas')

    def add(self, reserva: Reserva) -> Reserva:
        """
        Crea una reserva y sincroniza el estado de la fecha.
        """
        with self.fecha_service.redis_lock(reserva.fecha_id):
            fecha_entidad = self.fecha_service.repository.get_by_id(reserva.fecha_id)

            if not fecha_entidad:
                raise Exception(f"La fecha ID {reserva.fecha_id} no existe.")

            if fecha_entidad.estado != 'disponible':
                raise Exception("Lo sentimos, esta fecha ya ha sido seleccionada por otro usuario.")

            try:
                # Inicializar saldo restante igual al valor del alquiler al crear
                reserva.saldo_restante = reserva.valor_alquiler

                if reserva.estado == 'confirmada':
                    fecha_entidad.estado = 'reservada'
                else:
                    fecha_entidad.estado = 'pendiente'
                
                db.session.add(reserva)
                db.session.commit()

                cache.delete('reservas')
                cache.delete(f'fecha_{fecha_entidad.id}')
                cache.delete('fechas')

                return reserva

            except Exception as e:
                db.session.rollback()
                raise e

    def update(self, reserva_id: int, updated_data: dict) -> Reserva:
        """
        Actualiza los datos de una reserva y recalcula saldos si cambia el precio.
        """
        with self.redis_lock(reserva_id):
            reserva = self.repository.get_by_id(reserva_id)
            if not reserva:
                raise Exception(f"Reserva ID {reserva_id} no encontrada.")

            estado_anterior = reserva.estado
            precio_cambio = False # Flag para saber si cambió el precio

            for key, value in updated_data.items():
                if hasattr(reserva, key):
                    # Si cambia el valor_alquiler, marcamos para recalcular
                    if key == 'valor_alquiler' and float(getattr(reserva, key)) != float(value):
                        precio_cambio = True
                    setattr(reserva, key, value)
            
            nuevo_estado = reserva.estado

            if nuevo_estado == 'confirmada' and estado_anterior != 'confirmada':
                reserva.fecha.estado = 'reservada'
            elif nuevo_estado == 'cancelada' and estado_anterior != 'cancelada':
                reserva.fecha.estado = 'disponible'

            try:
                db.session.commit()

                # Si cambió el precio, recalculamos el saldo inmediatamente
                if precio_cambio:
                    # Nota: recalcular_saldo hace su propio commit y limpieza de caché
                    # pero como ya estamos dentro de un lock, podemos llamar a la lógica interna
                    # o simplemente invocar al método después.
                    pass 

                cache.delete(f'reserva_{reserva_id}')
                cache.delete('reservas')
                cache.delete(f'fecha_{reserva.fecha_id}')
                cache.delete('fechas')

                return reserva
            except Exception as e:
                db.session.rollback()
                raise e
            finally:
                # Si hubo cambio de precio, recalculamos fuera del bloque try principal 
                # para asegurar limpieza completa
                if precio_cambio:
                    self.recalcular_saldo(reserva_id)

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
        return self.repository.get_by_user_id(user_id)

    def get_all_archived(self) -> list[Reserva]:
        return self.repository.get_all_archived()