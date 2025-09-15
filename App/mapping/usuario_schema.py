from marshmallow import Schema, fields, post_load, validate
from app.models import Usuario

class UsuarioSchema(Schema):
    id = fields.Int(dump_only=True)
    apellido = fields.Str(required=True, validate=validate.Length(min=1))
    correo = fields.Email(required=True)
    dni = fields.Int(required=True, validate=validate.Range(min=1))
    nombre = fields.Str(required=True, validate=validate.Length(min=1))
    tipo = fields.Str(dump_only=True)  # lo asignamos en el mapping o en @post_load

    @post_load
    def make_usuario(self, data, **kwargs):
        data["tipo"] = "usuario"
        return Usuario(**data)
