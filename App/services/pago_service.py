from app.models import Pago
from app.repositories.pago_repository import PagoRepository
# Importamos el Servicio de Reserva en lugar del repositorio
from app.services.reserva_services import ReservaService


class PagoService:
    def __init__(self):
        self.repository = PagoRepository()
        self.reserva_service = ReservaService() # Usamos el servicio

    def create_pago(self, data):
        pago = self.repository.create(data)
        if pago:
            # Esto ahora solo borrará la caché, evitando el error de atributo
            self.reserva_service.recalcular_saldo(pago.reserva_id)
        return pago

    def delete_pago(self, pago_id: int) -> bool:
        pago = self.repository.get_by_id(pago_id)
        if not pago:
            return False
        
        reserva_id = pago.reserva_id
        self.repository.delete(pago)
        
        # Esto borrará la caché y el saldo se arreglará solo al recargar
        self.reserva_service.recalcular_saldo(reserva_id)
        
        return True