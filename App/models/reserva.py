from dataclasses import dataclass
from datetime import datetime

from app.extensions import db


@dataclass
class Reserva(db.Model):
    __tablename__ = 'reserva'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    fecha_creacion = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    fecha_vencimiento = db.Column(db.DateTime, nullable=True)
    estado = db.Column(db.String(20), nullable=False, default='pendiente')  # 'pendiente', 'confirmada', 'cancelada'

    # Relaciones
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)
    fecha_id = db.Column(db.Integer, db.ForeignKey('fecha.id'), nullable=False)

    usuario = db.relationship('Usuario', back_populates='reservas')
    fecha = db.relationship('Fecha', back_populates='reserva')
