import time
from contextlib import contextmanager
from datetime import date, datetime

from app.extensions import cache, db, redis_client
from app.models import Fecha, Reserva
from app.repositories import ReservaRepository
from app.services.fecha_services import FechaService
from app.utils.decorators import transactional


class ReservaService:
    """
    Servicio para gestionar reservas con soporte de caché y bloqueos en Redis para concurrencia.
    """
    CACHE_TIMEOUT = 300  # Tiempo de expiración de caché en segundos
    REDIS_LOCK_TIMEOUT = 10  # Tiempo de bloqueo en Redis en segundos

    def __init__(self, repository=None):
        self.repository = repository or ReservaRepository()
        self.fecha_service = FechaService() 

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


    @transactional
    def add(self, reserva: Reserva) -> Reserva:
        # 1. Bloqueo Distribuido (Redis)
        with self.fecha_service.redis_lock(reserva.fecha_id):
            
            # 2. Bloqueo Pesimista directo en la BD para asegurar persistencia
            fecha_a_reservar = db.session.query(Fecha).filter_by(id=reserva.fecha_id).with_for_update().first()

            if not fecha_a_reservar:
                raise Exception(f"La fecha con ID {reserva.fecha_id} no existe.")

            if fecha_a_reservar.estado != 'disponible':
                raise Exception("La fecha seleccionada ya no está disponible.")

            # 3. Sincronización exacta de estados ('reservada' o 'pendiente')
            if reserva.estado == 'confirmada':
                fecha_a_reservar.estado = 'reservada'
            else:
                fecha_a_reservar.estado = 'pendiente'
            
            db.session.add(reserva)
            
            # Generamos el ID en la BD sin cerrar la transacción
            db.session.flush()
            
            # 4. Limpieza y actualización de caché
            cache.clear() 
            cache.set(f'reserva_{reserva.id}', reserva, timeout=self.CACHE_TIMEOUT)
            cache.set(f'fecha_{fecha_a_reservar.id}', fecha_a_reservar, timeout=self.CACHE_TIMEOUT)

            return reserva
    @transactional
    def update(self, reserva_id: int, updated_data: dict) -> Reserva:
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
                
            reserva_fresca = self.repository.get_by_id(reserva_id)
            cache.clear() 

            return reserva_fresca

    @transactional
    def delete(self, reserva_id: int) -> bool:
        with self.redis_lock(reserva_id):
            reserva_a_archivar = self.repository.get_by_id(reserva_id)

            if not reserva_a_archivar:
                return False
            
            reserva_a_archivar.estado = 'archivada'

            fecha_asociada = reserva_a_archivar.fecha
            if fecha_asociada:
                fecha_asociada.estado = 'disponible'

            # El decorador @transactional hará el commit() al finalizar la función
            cache.clear() 

            return True

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
        Invalida la caché para forzar el recálculo del saldo_restante.
        """
        cache.clear()
        
    def get_by_user_id(self, user_id: int) -> list[Reserva]:
        """
        Obtiene todas las reservas de un usuario.
        """
        return self.repository.get_by_user_id(user_id)

    def search(self, term: str) -> list[Reserva]:
        """
        Busca reservas activas por coincidencia de texto en el cliente o estado.
        No utiliza caché para la búsqueda en vivo.
        """
        if not term:
            return []
        
        return self.repository.search(term)
    @transactional
    def procesar_arrepentimiento(self, datos: dict):
        """
        Procesa la solicitud de arrepentimiento validando los plazos legales (10 días)
        y la excepción por proximidad al evento.
        """
        identificacion = datos['identificacion']
        fecha_evento = datos['fecha_evento'] # Marshmallow ya lo parseó a un objeto Date
        motivo = datos.get('motivo', '')

        # 1. Buscar la reserva cruzando los datos
        reserva = self.repository.get_by_identificacion_and_date(identificacion, fecha_evento)
        
        if not reserva:
            raise ValueError("No encontramos una reserva activa para ese cliente en la fecha indicada.")

        # 2. Matemáticas de fechas
        hoy = date.today()
        
        # Extraemos solo la fecha (sin la hora) de cuando se creó la reserva
        fecha_creacion = reserva.fecha_creacion.date() if isinstance(reserva.fecha_creacion, datetime) else reserva.fecha_creacion
        
        # Asumiendo que el campo en tu modelo Fecha se llama 'dia'
        fecha_del_evento = reserva.fecha.dia 

        dias_desde_creacion = (hoy - fecha_creacion).days
        dias_para_evento = (fecha_del_evento - hoy).days

        # 3. Regla a favor del salón: Bloqueo por proximidad (ej. menos de 7 días)
        # Si la fecha está muy cerca, no permitimos cancelar automáticamente por el lucro cesante.
        if dias_para_evento < 7:
            raise ValueError(
                "Por la proximidad del evento (menos de 7 días), la cancelación automática "
                "por arrepentimiento no está disponible. Por favor, contactanos por WhatsApp."
            )

        # 4. Regla del consumidor: ¿Pasaron más de 10 días desde que señó?
        if dias_desde_creacion > 10:
            raise ValueError(
                "El plazo legal de 10 días corridos para la revocación sin costo ha expirado. "
                "Según la Cláusula 5 del contrato, no corresponde la devolución de la seña."
            )

        # 5. Todo en orden: Cancelamos y liberamos el calendario
        reserva.estado = 'cancelada'
        reserva.requiere_reintegro = True
        
        # Liberamos el objeto Fecha asociado para que otro cliente pueda reservarlo
        if reserva.fecha:
            reserva.fecha.estado = 'disponible' 

        if motivo:
            reserva.observaciones = f"Cancelación por Botón de Arrepentimiento. Motivo: {motivo}"
        # --- Limpieza de Caché ---
        cache.delete('reservas')
        cache.delete('fechas_disponibles')

        return reserva
    @transactional
    def marcar_reintegro_pagado(self, reserva_id: int):
        """
        Marca una reserva cancelada como 'pagada', bajando la bandera 
        de reintegro para que desaparezca del panel de pendientes.
        """
        reserva = self.repository.get_by_id(reserva_id)
        
        if not reserva:
            raise ValueError(f"No se encontró la reserva con ID {reserva_id}.")
            
        reserva.requiere_reintegro = False        
        reserva.observaciones = f"{reserva.observaciones} - [Reintegro transferido el {date.today()}]"
        return reserva
    
    def get_reintegros_pendientes(self):
        """
        Obtiene todas las reservas canceladas por arrepentimiento
        que tienen la bandera de reintegro activa.
        """
        # Delegamos la consulta al repositorio
        return self.repository.get_reintegros_pendientes()