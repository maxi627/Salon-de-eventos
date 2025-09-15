from dataclasses import dataclass

from app import db
from app.models import Persona


@dataclass
class Usuario(Persona):
    __tablename__ = 'usuario'

    id = db.Column(db.Integer, db.ForeignKey('persona.id'), primary_key=True)
    
    
    reservas = db.relationship('Reserva', back_populates='usuario')

    __mapper_args__ = {
        'polymorphic_identity': 'usuario',
    }
