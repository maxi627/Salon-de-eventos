from app import cache, redis_client  # Se asume que redis_client está configurado
from app.models import Administrador
from app.repositories import AdministradorRepository
from contextlib import contextmanager
import time

class AdministradorService:
    """
    Servicio para gestionar administradors con soporte de caché y bloqueos en Redis para concurrencia.
    """
    CACHE_TIMEOUT = 300  # Tiempo de expiración de caché en segundos
    REDIS_LOCK_TIMEOUT = 10  # Tiempo de bloqueo en Redis en segundos

    def __init__(self, repository=None):
        self.repository = repository or AdministradorRepository()

    @contextmanager
    def redis_lock(self, administrador_id: int):
        """
        Context manager para gestionar el bloqueo de recursos en Redis.
        """
        lock_key = f"administrador_lock_{administrador_id}"
        lock_value = str(time.time())

        if redis_client.set(lock_key, lock_value, ex=self.REDIS_LOCK_TIMEOUT, nx=True):
            try:
                yield  # Permite la ejecución del bloque protegido
            finally:
                redis_client.delete(lock_key)
        else:
            raise Exception(f"El recurso está bloqueado para la administrador {administrador_id}.")

    def all(self) -> list[Administrador]:
        """
        Obtiene la lista de todas las administradors, con caché.
        """
        cached_administradors = cache.get('administradors')
        if cached_administradors is None:
            administradors = self.repository.get_all()
            if administradors:
                cache.set('administradors', administradors, timeout=self.CACHE_TIMEOUT)
            return administradors
        return cached_administradors

    def add(self, administrador: Administrador) -> Administrador:
        """
        Agrega una nueva administrador y actualiza la caché.
        """
        new_administrador = self.repository.add(administrador)
        cache.set(f'administrador_{new_administrador.id}', new_administrador, timeout=self.CACHE_TIMEOUT)
        cache.delete('administradors')
        return new_administrador

    def update(self, administrador_id: int, updated_administrador: Administrador) -> Administrador:
        """
        Actualiza una administrador existente.
        :param administrador_id: ID de la administrador a actualizar.
        :param updated_administrador: Datos de la administrador actualizados.
        :return: Objeto Administrador actualizado.
        """
        with self.redis_lock(administrador_id):
            existing_administrador = self.find(administrador_id)
            if not existing_administrador:
                raise Exception(f"Administrador con ID {administrador_id} no encontrada.")

            # Actualizar los atributos del objeto existente
            existing_administrador.producto_id = updated_administrador.producto_id
            existing_administrador.fecha_administrador = updated_administrador.fecha_administrador
            existing_administrador.direccion_envio = updated_administrador.direccion_envio

            saved_administrador = self.repository.save(existing_administrador)

            # Actualizar la caché
            cache.set(f'administrador_{administrador_id}', saved_administrador, timeout=self.CACHE_TIMEOUT)
            cache.delete('administradors')  # Invalida la lista de administradors en caché

            return saved_administrador

    def delete(self, administrador_id: int) -> bool:
        """
        Elimina una administrador por su ID y actualiza la caché.
        """
        with self.redis_lock(administrador_id):
            deleted = self.repository.delete(administrador_id)
            if deleted:
                cache.delete(f'administrador_{administrador_id}')
                cache.delete('administradors')
            return deleted

    def find(self, administrador_id: int) -> Administrador:
        """
        Busca una administrador por su ID, con caché.
        """
        cached_administrador = cache.get(f'administrador_{administrador_id}')
        if cached_administrador is None:
            administrador = self.repository.get_by_id(administrador_id)
            if administrador:
                cache.set(f'administrador_{administrador_id}', administrador, timeout=self.CACHE_TIMEOUT)
            return administrador
        return cached_administrador
