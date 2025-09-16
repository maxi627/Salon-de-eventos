from typing import List

from app.extensions import db
from app.models import Persona

from .repository import (Repository_add, Repository_delete, Repository_get,
                         Repository_update)


class PersonaRepository(Repository_add, Repository_get, Repository_delete):
    def add(self, entity: Persona) -> Persona:
        try:
            db.session.add(entity)  
            db.session.commit()  
            return entity
        except Exception as e:
            db.session.rollback()  # Deshace la transacción si hay un error
            raise e  # Propaga la excepción para manejo externo

    def get_all(self) -> List[Persona]:
        return Persona.query.all()

    def get_by_id(self, id: int) -> Persona:
        return Persona.query.get(id)

    def delete(self, id: int) -> bool:
        try:
            Persona = self.get_by_id(id)
            if Persona:
                db.session.delete(Persona)
                db.session.commit()
                return True
            return False
        except Exception as e:
            db.session.rollback()  # Deshace la transacción si hay un error
            raise e  # Propaga la excepción para manejo externo
    def get_by_email(self, correo: str) -> Persona:
        return Persona.query.filter_by(correo=correo).first()