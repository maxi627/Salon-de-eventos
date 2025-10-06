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
            db.session.rollback()
            raise e
    def get_all_archived(self) -> List[Reserva]:
        """
        Obtiene todas las reservas que han sido marcadas como 'archivada'.
        """
        return Reserva.query.options(
            joinedload(Reserva.usuario),
            joinedload(Reserva.fecha)
        ).filter(Reserva.estado == 'archivada').all()

    def get_by_id(self, id: int) -> Reserva:
        # 3. APLICAMOS LA MISMA CORRECCIÓN AQUÍ
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

    def get_all(self) -> List[Reserva]:
        # Le decimos a la consulta que cargue las relaciones 'usuario' y 'fecha'
        # y que excluya las reservas archivadas.
        return Reserva.query.options(
            joinedload(Reserva.usuario),
            joinedload(Reserva.fecha)
        ).filter(Reserva.estado != 'archivada').all() # <-- LÍNEA MODIFICADA

    def get_by_user_id(self, user_id: int) -> List[Reserva]:
        # También excluimos las reservas archivadas de la vista del usuario.
        return Reserva.query.options(
            joinedload(Reserva.usuario),
            joinedload(Reserva.fecha)
        ).filter_by(usuario_id=user_id).filter(Reserva.estado != 'archivada').all() # <-- LÍNEA MODIFICADA