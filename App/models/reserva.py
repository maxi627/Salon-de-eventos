from dataclasses import dataclass
from datetime import datetime

from app.extensions import db


@dataclass
class Reserva(db.Model):
    __tablename__ = 'reserva'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    fecha_creacion = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    fecha_vencimiento = db.Column(db.DateTime, nullable=True)
    estado = db.Column(db.String(20), nullable=False, default='pendiente')
    comprobante_url = db.Column(db.String(256), nullable=True)
    valor_alquiler = db.Column(db.Float, nullable=True, default=0.0)
    # SALDO RESTANTE ELIMINADO - Se calculará dinámicamente
    ip_aceptacion = db.Column(db.String(45), nullable=True) 
    fecha_aceptacion = db.Column(db.DateTime, nullable=True) 
    version_contrato = db.Column(db.String(50), nullable=True, default='1.0') 
    
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)
    fecha_id = db.Column(db.Integer, db.ForeignKey('fecha.id'), nullable=False)

    usuario = db.relationship('Usuario', back_populates='reservas')
    fecha = db.relationship('Fecha', back_populates='reserva')

    # NUEVA RELACIÓN: Una reserva tiene muchos pagos
    pagos = db.relationship('Pago', back_populates='reserva')


    # Propiedad para calcular el saldo restante
    @property
    def saldo_restante(self):
        total_pagado = sum(pago.monto for pago in self.pagos)
        return (self.valor_alquiler or 0) - total_pagado