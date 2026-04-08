from typing import List

from app.extensions import db
from app.models import Usuario

from .repository import Repository_add, Repository_delete, Repository_get


class UsuarioRepository(Repository_add, Repository_get, Repository_delete):
    def add(self, entity: Usuario) -> Usuario:
        try:
            db.session.add(entity)  
            db.session.commit()  
            return entity
        except Exception as e:
            db.session.rollback()  # Deshace la transacción si hay un error
            raise e  # Propaga la excepción para manejo externo

    def get_all(self):
        return Usuario.query.filter_by(activo=True).order_by(Usuario.id.desc()).limit(100).all()

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
    
    
    def search(self, term: str, limit: int = 10) -> List[Usuario]:
        """Busca usuarios inteligentemente usando índices cuando es posible."""
        search_pattern = f"%{term}%"
        
        # 1. Condiciones base para texto (Nombres y Apellidos)
        condiciones = [
            Usuario.nombre.ilike(search_pattern),
            Usuario.apellido.ilike(search_pattern),
            db.func.concat(Usuario.nombre, ' ', Usuario.apellido).ilike(search_pattern),
            db.func.concat(Usuario.apellido, ' ', Usuario.nombre).ilike(search_pattern)
        ]

        # 2. Lógica Inteligente para Números (DNI)
        if term.isdigit():
            # Si escribió 7 o más números, asumimos que busca el DNI exacto
            if len(term) >= 7:
                # ¡MAGIA! Búsqueda exacta matemática. Usa el índice de la DB al instante.
                condiciones.append(Usuario.dni == int(term))
            else:
                # Si está tipeando de a poco (ej: "442"), mantenemos la búsqueda parcial
                condiciones.append(db.cast(Usuario.dni, db.String).ilike(search_pattern))
        else:
            # Si el término tiene letras, lo tratamos como búsqueda parcial normal
            condiciones.append(db.cast(Usuario.dni, db.String).ilike(search_pattern))

        return Usuario.query.filter(
            Usuario.activo == True,
            db.or_(*condiciones)
        ).limit(limit).all()