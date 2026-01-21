from app.extensions import cache
from app.models import Pago
from app.repositories.pago_repository import PagoRepository
from app.repositories.reserva_repository import \
    ReservaRepository  # <--- IMPORTAR ESTO


class PagoService:
    def __init__(self):
        self.repository = PagoRepository()
        self.reserva_repository = ReservaRepository() # <--- INICIALIZAR ESTO

    def create_pago(self, data):
        # 1. Crear el pago en la DB
        pago = self.repository.create(data)
        
        if pago:
            # --- PASO CRÍTICO QUE FALTABA ---
            # Buscar la reserva asociada
            reserva = self.reserva_repository.get_by_id(pago.reserva_id)
            
            if reserva:
                # Calcular el nuevo saldo (Saldo actual - Monto del pago)
                # Asegúrate de que los tipos de datos sean numéricos
                nuevo_saldo = float(reserva.saldo_restante) - float(pago.monto)
                
                # Actualizar el saldo en la base de datos
                self.reserva_repository.update(reserva.id, {'saldo_restante': nuevo_saldo})

            # 3. Invalidar caché
            cache.delete(f'reserva_{pago.reserva_id}')
            cache.delete('reservas')
            
        return pago

    def delete_pago(self, pago_id: int) -> bool:
        pago = self.repository.get_by_id(pago_id)
        if not pago:
            return False
        
        reserva_id = pago.reserva_id
        monto_a_devolver = float(pago.monto) # Guardamos el monto antes de borrar

        # Eliminamos el pago
        self.repository.delete(pago)

        # --- PASO CRÍTICO AL BORRAR ---
        # Devolver el dinero al saldo de la reserva
        reserva = self.reserva_repository.get_by_id(reserva_id)
        if reserva:
            nuevo_saldo = float(reserva.saldo_restante) + monto_a_devolver
            self.reserva_repository.update(reserva_id, {'saldo_restante': nuevo_saldo})

        # Invalidamos la caché
        cache.delete(f'reserva_{reserva_id}')
        cache.delete('reservas') 
        
        return True
    
