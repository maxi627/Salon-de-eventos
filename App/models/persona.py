import hashlib
import hmac
import os
from dataclasses import dataclass
from time import time
from datetime import datetime

import jwt
from flask import current_app
from passlib.hash import pbkdf2_sha256 as sha256

from app.extensions import db


@dataclass
class Persona(db.Model):
    __tablename__ = 'persona'

    id: int = db.Column('id', db.Integer, primary_key=True, autoincrement=True)
    apellido: str = db.Column('apellido', db.String, nullable=False, index=True)
    correo: str = db.Column('correo', db.String, unique=True, nullable=False)
    dni: int = db.Column('dni', db.Integer, unique=True, nullable=False)
    nombre: str = db.Column('nombre', db.String, nullable=False, index=True)
    telefono: str = db.Column('telefono', db.String(50), nullable=True)
    password_hash: str = db.Column(db.String(128), nullable=False)
    tipo = db.Column(db.String(50), nullable=False)
    activo = db.Column(db.Boolean, default=True, nullable=False)
    
    # Nuevos campos de respaldo legal (Privacidad y Tratamiento de Datos)
    consentimiento_datos: bool = db.Column(db.Boolean, default=False, nullable=False)
    fecha_consentimiento: datetime = db.Column(db.DateTime, nullable=True)

    __mapper_args__ = {
        'polymorphic_identity': 'persona',
        'polymorphic_on': tipo
    }

    def set_password(self, password):
        """Crea un hash seguro de la contraseña."""
        self.password_hash = sha256.hash(password)

    def check_password(self, password):
        """Verifica la contraseña contra el hash almacenado."""
        return sha256.verify(password, self.password_hash)

  
    @staticmethod
    def _reset_secret() -> str:
        """
        Clave exclusiva para tokens de reseteo (separada de la de sesión).
        Usa PASSWORD_RESET_SECRET si está definida; si no, la deriva de JWT_SECRET_KEY.
        """
        secret = os.getenv('PASSWORD_RESET_SECRET')
        if secret:
            return secret
        base = current_app.config['JWT_SECRET_KEY'].encode()
        return hmac.new(base, b'password-reset', hashlib.sha256).hexdigest()

    def _password_fingerprint(self) -> str:
        """Huella del hash actual: al cambiar la contraseña, los tokens anteriores dejan de servir."""
        return hashlib.sha256(self.password_hash.encode()).hexdigest()[:32]

    def get_reset_token(self, expires_in=600):
        """Genera un token de reseteo de un solo uso con tiempo de expiración (600s = 10 min)."""
        return jwt.encode(
            {'reset_password': self.id, 'pwd': self._password_fingerprint(), 'exp': time() + expires_in},
            Persona._reset_secret(),
            algorithm='HS256'
        )

    @staticmethod
    def verify_reset_token(token):
        """Verifica el token de reseteo y devuelve la instancia de Persona si es válido."""
        try:
            payload = jwt.decode(token, Persona._reset_secret(), algorithms=['HS256'])
            user = Persona.query.get(payload['reset_password'])
        except (jwt.InvalidTokenError, KeyError, TypeError):
            return None

        if not user or not user.activo:
            return None
        # Si la contraseña ya cambió (ej. el token ya se usó), el token queda invalidado
        if not hmac.compare_digest(str(payload.get('pwd', '')), user._password_fingerprint()):
            return None
        return user