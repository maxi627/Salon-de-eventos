from app.extensions import cache
from app.models import Pago
from app.repositories.pago_repository import PagoRepository


class PagoService:
    def __init__(self):
        self.repository = PagoRepository()

    def delete_pago(self, pago_id: int) -> bool:
        pago = self.repository.get_by_id(pago_id)
        if not pago:
            return False
        
        # Guardamos el ID de la reserva antes de borrar el pago
        reserva_id = pago.reserva_id

        # Eliminamos el pago
        self.repository.delete(pago)

        # Invalidamos la caché de la reserva asociada para que se actualice el saldo
        cache.delete(f'reserva_{reserva_id}')
        cache.delete('reservas') # También la lista general
        
        return True