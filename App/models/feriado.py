from dataclasses import dataclass

from app.extensions import db


@dataclass
class Feriado(db.Model):
    """Feriado nacional de Argentina (inamovible, trasladable o puente turístico).
    Se completa solo desde una API pública (ver app/feriados.py)."""
    __tablename__ = 'feriado'

    id: int = db.Column(db.Integer, primary_key=True, autoincrement=True)
    fecha = db.Column(db.Date, nullable=False, unique=True, index=True)
    nombre: str = db.Column(db.String(200), nullable=False)
    tipo: str = db.Column(db.String(30), nullable=False, default='')
