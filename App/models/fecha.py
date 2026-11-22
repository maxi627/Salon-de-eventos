from dataclasses import dataclass

from app.extensions import db


@dataclass
class Fecha(db.Model):
    __tablename__ = 'fecha'
    #indices compuestos para optimizar consultas
    __table_args__ = (
        db.Index('idx_fecha_dia', 'dia'),               # búsqueda por día exacto
        db.Index('idx_fecha_estado_dia', 'estado', 'dia'),  # filtrar disponibles + ordenar
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    dia = db.Column(db.Date, nullable=False, unique=True)
    # Estado del turno día: 'disponible', 'pendiente' o 'reservada'
    estado = db.Column(db.String(20), nullable=False, default='disponible')
    # Estado del turno noche (20:30 a 4:30), mismos valores. Ver app/turnos.py
    estado_noche = db.Column(db.String(20), nullable=False, default='disponible', server_default='disponible')
    valor_estimado = db.Column(db.Float, nullable=False, default=0.0)
    # Precio de oferta (nulo = sin oferta). Mientras la fecha sea reservable, es el precio que vale.
    valor_oferta = db.Column(db.Float, nullable=True)

    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=True)

    # Una fecha puede tener una reserva de día y otra de noche (o una completa)
    reservas = db.relationship('Reserva', back_populates='fecha', lazy='select')
