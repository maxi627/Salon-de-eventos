from dataclasses import dataclass

from app.extensions import db


@dataclass
class Persona(db.Model):
    __tablename__ = 'persona'

    id: int = db.Column('id', db.Integer, primary_key=True, autoincrement=True)
    apellido: str = db.Column('apellido', db.String, nullable=False)
    correo: str = db.Column('correo', db.String, nullable=False)
    dni: int = db.Column('dni', db.Integer, unique=True, nullable=False)
    nombre: str = db.Column('nombre', db.String, nullable=False)
    tipo = db.Column(db.String(50), nullable=False) # "usuario" o "administrador"

    __mapper_args__ = {
        'polymorphic_identity': 'persona',
        'polymorphic_on': tipo
    }