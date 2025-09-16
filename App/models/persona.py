from dataclasses import dataclass

from passlib.hash import pbkdf2_sha256 as sha256

from app.extensions import db


@dataclass
class Persona(db.Model):
    __tablename__ = 'persona'

    id: int = db.Column('id', db.Integer, primary_key=True, autoincrement=True)
    apellido: str = db.Column('apellido', db.String, nullable=False)
    correo: str = db.Column('correo', db.String, unique=True, nullable=False) 
    dni: int = db.Column('dni', db.Integer, unique=True, nullable=False)
    nombre: str = db.Column('nombre', db.String, nullable=False)
    # --- AÑADIR ESTE CAMPO ---
    password_hash: str = db.Column(db.String(128), nullable=False)
    tipo = db.Column(db.String(50), nullable=False)

    __mapper_args__ = {
        'polymorphic_identity': 'persona',
        'polymorphic_on': tipo
    }

    # --- AÑADIR ESTOS MÉTODOS ---
    def set_password(self, password):
        """Crea un hash seguro de la contraseña."""
        self.password_hash = sha256.hash(password)

    def check_password(self, password):
        """Verifica la contraseña contra el hash almacenado."""
        return sha256.verify(password, self.password_hash)