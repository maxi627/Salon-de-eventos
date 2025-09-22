from dataclasses import dataclass
from datetime import datetime
from app.extensions import db

@dataclass
class Reserva(db.Model):
    __tablename__ = 'reserva'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    fecha_creacion = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    # ... (otros campos no cambian)
    valor_alquiler = db.Column(db.Float, nullable=True, default=0.0)
    ip_aceptacion = db.Column(db.String(45), nullable=True) 
    fecha_aceptacion = db.Column(db.DateTime, nullable=True) 
    version_contrato = db.Column(db.String(50), nullable=True, default='1.0') 
    
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)
    fecha_id = db.Column(db.Integer, db.ForeignKey('fecha.id'), nullable=False)

    usuario = db.relationship('Usuario', back_populates='reservas')
    fecha = db.relationship('Fecha', back_populates='reserva')

    # --- LÍNEA MODIFICADA ---
    # Se elimina la opción 'cascade', que borraba los pagos automáticamente.
    # Ahora, la base de datos protegerá los pagos y no permitirá borrar una reserva si tiene pagos asociados.
    pagos = db.relationship('Pago', back_populates='reserva')

    @property
    def saldo_restante(self):
        total_pagado = sum(pago.monto for pago in self.pagos)
        return (self.valor_alquiler or 0) - total_pagado