from dataclasses import dataclass

from app import db


@dataclass
class Fecha(db.Model):
    __tablename__ = 'fecha'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    dia = db.Column(db.Date, nullable=False, unique=True)
    estado = db.Column(db.String(20), nullable=False, default='disponible')  # 'disponible', 'pendiente', 'reservada'

    # Relación con Usuario (opcional si querés guardar quién bloqueó/reservó la fecha)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=True)

    # Relación con reserva (1 a 1)
    reserva = db.relationship('Reserva', back_populates='fecha', uselist=False)
