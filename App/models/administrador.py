from dataclasses import dataclass
from app import db
from app.models import Persona

@dataclass
class Administrador(Persona):
    __tablename__ = 'administrador'

    id = db.Column(db.Integer, db.ForeignKey('persona.id'), primary_key=True)

    __mapper_args__ = {
        'polymorphic_identity': 'administrador',
    }

