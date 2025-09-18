import time
from contextlib import contextmanager
from datetime import date

from app.extensions import cache, db, redis_client
from app.models import Fecha
from app.repositories import FechaRepository


class FechaService:
    """
    Servicio para gestionar fechas con soporte de caché y bloqueos en Redis para concurrencia.
    """
    CACHE_TIMEOUT = 300  # Tiempo de expiración de caché en segundos
    REDIS_LOCK_TIMEOUT = 10  # Tiempo de bloqueo en Redis en segundos

    def __init__(self, repository=None):
        self.repository = repository or FechaRepository()

    @contextmanager
    def redis_lock(self, fecha_id: int):
        """
        Context manager para gestionar el bloqueo de recursos en Redis.
        """
        lock_key = f"fecha_lock_{fecha_id}"
        lock_value = str(time.time())

        if redis_client.set(lock_key, lock_value, ex=self.REDIS_LOCK_TIMEOUT, nx=True):
            try:
                yield  # Permite la ejecución del bloque protegido
            finally:
                redis_client.delete(lock_key)
        else:
            raise Exception(f"El recurso está bloqueado para la fecha {fecha_id}.")

    def all(self) -> list[Fecha]:
        """
        Obtiene la lista de todas las fechas, con caché.
        """
        cached_fechas = cache.get('fechas')
        if cached_fechas is None:
            fechas = self.repository.get_all()
            if fechas:
                cache.set('fechas', fechas, timeout=self.CACHE_TIMEOUT)
            return fechas
        return cached_fechas

    def add(self, fecha: Fecha) -> Fecha:
        """
        Agrega una nueva fecha y actualiza la caché.
        """
        new_fecha = self.repository.add(fecha)
        cache.set(f'fecha_{new_fecha.id}', new_fecha, timeout=self.CACHE_TIMEOUT)
        cache.delete('fechas')
        return new_fecha

    def update(self, fecha_id: int, updated_data: dict) -> Fecha:
        """
        Actualiza una fecha existente a partir de un diccionario de datos.
        """
        with self.redis_lock(fecha_id):
            existing_fecha = self.find(fecha_id)
            if not existing_fecha:
                raise Exception(f"Fecha con ID {fecha_id} no encontrada.")

            # Actualizamos solo los campos que vienen en el diccionario.
            # Esto hace la función mucho más flexible y segura para actualizaciones.
            if 'valor_estimado' in updated_data:
                try:
                    # Nos aseguramos de que el valor sea un número flotante.
                    existing_fecha.valor_estimado = float(updated_data['valor_estimado'])
                except (ValueError, TypeError):
                    # Si el valor no es un número válido, lanzamos un error.
                    raise ValueError("El valor_estimado debe ser un número válido.")

            # Guardar los cambios en la base de datos
            db.session.commit()

            # Actualizar la caché con el objeto modificado
            cache.set(f'fecha_{fecha_id}', existing_fecha, timeout=self.CACHE_TIMEOUT)
            cache.delete('fechas') # Invalidamos la lista general de fechas

            return existing_fecha
    def delete(self, fecha_id: int) -> bool:
        """
        Elimina una fecha por su ID y actualiza la caché.
        """
        with self.redis_lock(fecha_id):
            deleted = self.repository.delete(fecha_id)
            if deleted:
                cache.delete(f'fecha_{fecha_id}')
                cache.delete('fechas')
            return deleted

    def find(self, fecha_id: int) -> Fecha:
        """
        Busca una fecha por su ID, con caché.
        """
        cached_fecha = cache.get(f'fecha_{fecha_id}')
        if cached_fecha is None:
            fecha = self.repository.get_by_id(fecha_id)
            if fecha:
                cache.set(f'fecha_{fecha_id}', fecha, timeout=self.CACHE_TIMEOUT)
            return fecha
        return cached_fecha
    def find_by_dia(self, dia: date) -> Fecha:
        """Busca una fecha por su día usando el repositorio."""
        return self.repository.get_by_dia(dia)

    def get_or_create(self, dia: date) -> Fecha:
        """
        Busca una fecha por día. Si no existe, la crea con estado 'disponible'.
        Este método asegura que siempre tengamos un registro en la BD para trabajar.
        """
        fecha = self.find_by_dia(dia)
        if not fecha:
            # La fecha no existe en la BD, así que la creamos.
            nueva_fecha = Fecha(dia=dia, estado='disponible')
            fecha = self.add(nueva_fecha) # Reutilizamos el método add que ya maneja la BD y el caché.
        return fecha