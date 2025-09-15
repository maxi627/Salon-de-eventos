from typing import List

from app.extensions import db
from app.models import Reserva

from .repository import (Repository_add, Repository_delete, Repository_get,
                         Repository_update)


class ReservaRepository(Repository_add, Repository_get, Repository_delete):
    def add(self, entity: Reserva) -> Reserva:
        try:
            db.session.add(entity)  
            db.session.commit()  
            return entity
        except Exception as e:
            db.session.rollback()  # Deshace la transacción si hay un error
            raise e  # Propaga la excepción para manejo externo

    def get_all(self) -> List[Reserva]:
        return Reserva.query.all()

    def get_by_id(self, id: int) -> Reserva:
        return Reserva.query.get(id)

    def delete(self, id: int) -> bool:
        try:
            Reserva = self.get_by_id(id)
            if Reserva:
                db.session.delete(Reserva)  
                db.session.commit()  
                return True
            return False
        except Exception as e:
            db.session.rollback()  # Deshace la transacción si hay un error
            raise e  # Propaga la excepción para manejo externo
