from app import cache, redis_client  # Se asume que redis_client está configurado
from app.models import Usuario
from app.repositories import UsuarioRepository
from contextlib import contextmanager
import time
from app import db
class UsuarioService:
    """
    Servicio para gestionar usuarios con soporte de caché y bloqueos en Redis para concurrencia.
    """
    CACHE_TIMEOUT = 300  # Tiempo de expiración de caché en segundos
    REDIS_LOCK_TIMEOUT = 10  # Tiempo de bloqueo en Redis en segundos

    def __init__(self, repository=None):
        self.repository = repository or UsuarioRepository()

    @contextmanager
    def redis_lock(self, usuario_id: int):
        """
        Context manager para gestionar el bloqueo de recursos en Redis.
        """
        lock_key = f"usuario_lock_{usuario_id}"
        lock_value = str(time.time())

        if redis_client.set(lock_key, lock_value, ex=self.REDIS_LOCK_TIMEOUT, nx=True):
            try:
                yield  # Permite la ejecución del bloque protegido
            finally:
                redis_client.delete(lock_key)
        else:
            raise Exception(f"El recurso está bloqueado para el usuario {usuario_id}.")

    def all(self) -> list[Usuario]:
        """
        Obtiene la lista de todos los usuarios, con caché.
        """
        cached_usuarios = cache.get('usuarios')
        if cached_usuarios is None:
            usuarios = self.repository.get_all()
            if usuarios:
                cache.set('usuarios', usuarios, timeout=self.CACHE_TIMEOUT)
            return usuarios
        return cached_usuarios

    def add(self, usuario: Usuario) -> Usuario:
        """
        Agrega un nuevo usuario y actualiza la caché.
        """
        new_usuario = self.repository.add(usuario)
        cache.set(f'usuario_{new_usuario.id}', new_usuario, timeout=self.CACHE_TIMEOUT)
        cache.delete('usuarios')
        return new_usuario

    def update(self, usuario_id: int, updated_usuario: Usuario) -> Usuario:
        """
        Actualiza un usuario existente.
        :param usuario_id: ID del usuario a actualizar.
        :param updated_usuario: Datos del usuario actualizados.
        :return: Objeto Usuario actualizado.
        """
        with self.redis_lock(usuario_id):
            existing_usuario = self.find(usuario_id)
            if not existing_usuario:
                raise Exception(f"Usuario con ID {usuario_id} no encontrada.")

            # Actualizar los atributos del objeto existente
            existing_usuario.nombre = updated_usuario.nombre
            existing_usuario.apellido = updated_usuario.apellido
            existing_usuario.dni = updated_usuario.dni
            existing_usuario.correo = updated_usuario.correo

            db.session.commit()
            # Actualizar caché
            cache.set(f'usuario_{usuario_id}', existing_usuario, timeout=self.CACHE_TIMEOUT)
            cache.delete('usuarios')  # Invalida la lista de usuarios en caché

            return existing_usuario

    def delete(self, usuario_id: int) -> bool:
        """
        Elimina un usuario por su ID y actualiza la caché.
        """
        with self.redis_lock(usuario_id):
            deleted = self.repository.delete(usuario_id)
            if deleted:
                cache.delete(f'usuario_{usuario_id}')
                cache.delete('usuarios')
            return deleted

    def find(self, usuario_id: int) -> Usuario:
        """
        Busca un usuario por su ID, con caché.
        """
        cached_usuario = cache.get(f'usuario_{usuario_id}')
        if cached_usuario is None:
            usuario = self.repository.get_by_id(usuario_id)
            if usuario:
                cache.set(f'usuario_{usuario_id}', usuario, timeout=self.CACHE_TIMEOUT)
            return usuario
        return cached_usuario
