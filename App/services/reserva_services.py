import hashlib
import hmac
import secrets
import time
from contextlib import contextmanager
from datetime import date, datetime

from flask import current_app
from werkzeug.utils import secure_filename

from app.extensions import cache, db, redis_client
from app.models import Fecha, Reserva
from app.repositories import ReservaRepository
from app.services import NotificationService
from app.services.fecha_services import FechaService
from app.utils.decorators import transactional
from app.utils.file_validation import detectar_tipo_archivo
from app.utils.storage import upload_bytes_to_r2


class ReservaService:
    """
    Servicio para gestionar reservas con soporte de caché y bloqueos en Redis para concurrencia.
    """
    CACHE_TIMEOUT = 300  # Tiempo de expiración de caché en segundos
    REDIS_LOCK_TIMEOUT = 10  # Tiempo de bloqueo en Redis en segundos
    ARREPENTIMIENTO_CODE_TTL = 900  # Validez del código de confirmación (15 min)
    ARREPENTIMIENTO_MAX_INTENTOS = 5
    ARREPENTIMIENTO_COOLDOWN = 60  # Evita reenviar correos a la misma reserva en ráfaga

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
                raise ValueError("La fecha seleccionada no existe.")

            if fecha_a_reservar.estado != 'disponible':
                raise ValueError("La fecha seleccionada ya no está disponible.")

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
    def _hash_codigo_arrepentimiento(self, reserva_id: int, codigo: str) -> str:
        secret = current_app.config['JWT_SECRET_KEY'].encode()
        return hmac.new(secret, f"{reserva_id}:{codigo}".encode(), hashlib.sha256).hexdigest()

    def solicitar_codigo_arrepentimiento(self, datos: dict) -> None:
        """
        Paso 1 del botón de arrepentimiento: si los datos coinciden con una reserva activa,
        envía al correo registrado un código de confirmación (o el motivo por el que no aplica).
        No devuelve nada para no revelar si existe la reserva.
        """
        reserva = self.repository.get_by_identificacion_and_date(datos['identificacion'], datos['fecha_evento'])
        if not reserva or not reserva.usuario:
            return

        cooldown_key = f"arrepentimiento_cooldown:{reserva.id}"
        if not redis_client.set(cooldown_key, 1, ex=self.ARREPENTIMIENTO_COOLDOWN, nx=True):
            return

        from app.tasks import enviar_codigo_arrepentimiento_async

        datos_correo = {
            "to_email": reserva.usuario.correo,
            "user_name": reserva.usuario.nombre,
            "event_date": reserva.fecha.dia.strftime('%d/%m/%Y'),
        }

        try:
            self._validar_plazos_arrepentimiento(reserva)
        except ValueError as e:
            enviar_codigo_arrepentimiento_async.delay(**datos_correo, motivo_rechazo=str(e))
            return

        codigo = f"{secrets.randbelow(10**6):06d}"
        key = f"arrepentimiento:{reserva.id}"
        pipe = redis_client.pipeline()
        pipe.delete(key)
        pipe.hset(key, mapping={
            "hash": self._hash_codigo_arrepentimiento(reserva.id, codigo),
            "intentos": 0,
            "motivo": datos.get('motivo') or '',
        })
        pipe.expire(key, self.ARREPENTIMIENTO_CODE_TTL)
        pipe.execute()

        enviar_codigo_arrepentimiento_async.delay(**datos_correo, codigo=codigo)

    @transactional
    def confirmar_arrepentimiento(self, datos: dict) -> Reserva:
        """
        Paso 2: verifica el código enviado por correo y recién entonces cancela la reserva.
        """
        error_generico = ValueError("El código es inválido o expiró. Solicitá uno nuevo.")

        reserva = self.repository.get_by_identificacion_and_date(datos['identificacion'], datos['fecha_evento'])
        if not reserva:
            raise error_generico

        key = f"arrepentimiento:{reserva.id}"
        guardado = redis_client.hgetall(key)
        if not guardado:
            raise error_generico

        if redis_client.hincrby(key, "intentos", 1) > self.ARREPENTIMIENTO_MAX_INTENTOS:
            redis_client.delete(key)
            raise error_generico

        hash_recibido = self._hash_codigo_arrepentimiento(reserva.id, datos['codigo'])
        if not hmac.compare_digest(guardado["hash"], hash_recibido):
            raise error_generico

        # Código de un solo uso
        redis_client.delete(key)
        return self._cancelar_por_arrepentimiento(reserva, guardado.get("motivo", ""))

    def _validar_plazos_arrepentimiento(self, reserva: Reserva) -> None:
        """
        Valida los plazos legales (10 días) y la excepción por proximidad al evento.
        Lanza ValueError si la cancelación automática no corresponde.
        """
        hoy = date.today()
        from datetime import datetime
        fecha_creacion = reserva.fecha_creacion.date() if isinstance(reserva.fecha_creacion, datetime) else reserva.fecha_creacion
        fecha_del_evento = reserva.fecha.dia 

        dias_desde_creacion = (hoy - fecha_creacion).days
        dias_para_evento = (fecha_del_evento - hoy).days

        # 3. Regla a favor del salón: Bloqueo por proximidad
        if dias_para_evento < 7:
            raise ValueError(
                "Por la proximidad del evento (menos de 7 días), la cancelación automática "
                "por arrepentimiento no está disponible. Por favor, contactanos por WhatsApp."
            )

        # 4. Regla del consumidor: Plazo legal de 10 días
        if dias_desde_creacion > 10:
            raise ValueError(
                "El plazo legal de 10 días corridos para la revocación sin costo ha expirado. "
                "Según la Cláusula 5 del contrato, no corresponde la devolución de la seña."
            )

    def _cancelar_por_arrepentimiento(self, reserva: Reserva, motivo: str) -> Reserva:
        # Se revalidan los plazos: pueden haber vencido entre la solicitud y la confirmación
        self._validar_plazos_arrepentimiento(reserva)

        # Todo en orden: Cancelamos y liberamos el calendario
        reserva.estado = 'cancelada'
        reserva.requiere_reintegro = True
        
        if reserva.fecha:
            reserva.fecha.estado = 'disponible' 

        reserva.observaciones = f"Cancelación por Botón de Arrepentimiento. Motivo: {motivo}" if motivo else "Cancelación por Botón de Arrepentimiento. Sin motivo especificado."
            
        # --- Limpieza de Caché ---
        from app.extensions import cache
        cache.delete('reservas')
        cache.delete('fechas_disponibles')

        # --- 6. Notificación Asíncrona por Telegram (CELERY) ---
        nombre_cliente = f"{reserva.usuario.nombre} {reserva.usuario.apellido}" if reserva.usuario else "Cliente no registrado"
        
        # Importación local para evitar Circular Imports
        from app.tasks import notificar_arrepentimiento_async

        # Disparamos la tarea a Celery pasando solo strings
        notificar_arrepentimiento_async.delay(
            nombre_cliente=nombre_cliente,
            fecha_evento=str(reserva.fecha.dia),
            motivo=motivo
        )

        return reserva
    @transactional
    def marcar_reintegro_pagado(self, reserva_id: int, comprobante_file):
        reserva = self.repository.get_by_id(reserva_id)
        
        if not reserva:
            raise ValueError(f"No se encontró la reserva con ID {reserva_id}.")

        # Lanza ValueError si el archivo no es PDF/JPG/PNG/WEBP
        extension, content_type = detectar_tipo_archivo(comprobante_file)

        # 1. Bajamos la bandera y archivamos la reserva
        reserva.requiere_reintegro = False
        reserva.estado = 'archivada'
        
        # 2. Leer los bytes del archivo que subiste desde React en memoria
        file_bytes = comprobante_file.read()
        file_name = f"reintegro_{reserva_id}.{extension}"

        # 3. Subir a R2
        comprobante_url = upload_bytes_to_r2(file_bytes, file_name, folder="comprobantes_reintegros", content_type=content_type)
        
        # Si la subida falla, cortamos la ejecución para no dejar datos inconsistentes
        if not comprobante_url:
            raise ValueError("Error al subir el comprobante a R2. Intentá nuevamente.")
        from app.tasks import tarea_enviar_reintegro_async

        # 4. DELEGAR A CELERY usando .delay()
        tarea_enviar_reintegro_async.delay(
            to_email=reserva.usuario.correo,
            user_name=reserva.usuario.nombre,
            event_date=str(reserva.fecha.dia),
            file_url=comprobante_url,
            file_name=file_name
        )

        # 5. Dejamos un registro textual por las dudas
        reserva.observaciones = f"{reserva.observaciones} | Reintegro transferido. URL Comprobante: {comprobante_url}"
        cache.delete('reservas')
        
        return reserva
    def get_reintegros_pendientes(self):
        """
        Obtiene todas las reservas canceladas por arrepentimiento
        que tienen la bandera de reintegro activa.
        """
        # Delegamos la consulta al repositorio
        return self.repository.get_reintegros_pendientes()