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
    comprobante_url = db.Column(db.String(256), nullable=True) # Guarda la ruta al archivo
    valor_alquiler = db.Column(db.Float, nullable=True, default=0.0)
    valor_estimado = db.Column(db.Float, nullable=True, default=0.0)
    saldo_restante = db.Column(db.Float, nullable=True, default=0.0)
    # Guarda la IP del usuario que aceptó.
    ip_aceptacion = db.Column(db.String(45), nullable=True) 
    # Guarda la fecha y hora exactas de la aceptación.
    fecha_aceptacion = db.Column(db.DateTime, nullable=True) 
    # Guarda la versión del contrato que se aceptó (importante si lo cambias a futuro).
    version_contrato = db.Column(db.String(50), nullable=True, default='1.0') 
    # Relaciones
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)
    fecha_id = db.Column(db.Integer, db.ForeignKey('fecha.id'), nullable=False)

    usuario = db.relationship('Usuario', back_populates='reservas')
    fecha = db.relationship('Fecha', back_populates='reserva')
