from typing import List
from app import db
from app.models import Usuario
from .repository import (Repository_add, Repository_delete, Repository_get)


class UsuarioRepository(Repository_add, Repository_get, Repository_delete):
    def add(self, entity: Usuario) -> Usuario:
        try:
            db.session.add(entity)  
            db.session.commit()  
            return entity
        except Exception as e:
            db.session.rollback()  # Deshace la transacción si hay un error
            raise e  # Propaga la excepción para manejo externo

    def get_all(self) -> List[Usuario]:
        return Usuario.query.all()

    def get_by_id(self, id: int) -> Usuario:
        return Usuario.query.get(id)

    def delete(self, id: int) -> bool:
        try:
            usuario = self.get_by_id(id)
            if usuario:
                db.session.delete(usuario)  
                db.session.commit()  
                return True
            return False
        except Exception as e:
            db.session.rollback()  # Deshace la transacción si hay un error
            raise e  # Propaga la excepción para manejo externo
