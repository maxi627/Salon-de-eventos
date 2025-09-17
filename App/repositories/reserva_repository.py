from typing import List

from sqlalchemy.orm import joinedload

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
        return Reserva.query.options(
            joinedload(Reserva.usuario), 
            joinedload(Reserva.fecha)
        ).all()

    def get_by_id(self, id: int) -> Reserva:
        # TAMBIÉN LO APLICAMOS AQUÍ PARA ASEGURARNOS
        return Reserva.query.options(
            joinedload(Reserva.usuario), 
            joinedload(Reserva.fecha)
        ).filter_by(id=id).first()
        
    def delete(self, id: int) -> bool:
        try:
            reserva = self.get_by_id(id)
            if reserva:
                db.session.delete(reserva)  
                db.session.commit()  
                return True
            return False
        except Exception as e:
            db.session.rollback()
            raise e