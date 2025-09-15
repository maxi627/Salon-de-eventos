from marshmallow import Schema, fields, post_load, validate

from app.models import Administrador


class AdministradorSchema(Schema):
    id = fields.Int(dump_only=True)
    apellido = fields.Str(required=True, validate=validate.Length(min=1))
    correo = fields.Email(required=True)
    dni = fields.Int(required=True, validate=validate.Range(min=1))
    nombre = fields.Str(required=True, validate=validate.Length(min=1))
    tipo = fields.Str(dump_only=True)

    @post_load
    def make_admin(self, data, **kwargs):
        # data["tipo"] = "administrador" # SQLAlchemy lo hace automáticamente
        return Administrador(**data)