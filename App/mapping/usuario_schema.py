from marshmallow import Schema, fields, post_load, validate

from app.models import Usuario  # (o Administrador)


class UsuarioSchema(Schema): # (o AdministradorSchema)
    id = fields.Int(dump_only=True)
    apellido = fields.Str(required=True, validate=validate.Length(min=1))
    correo = fields.Email(required=True)
    dni = fields.Int(required=True, validate=validate.Range(min=1))
    nombre = fields.Str(required=True, validate=validate.Length(min=1))
    tipo = fields.Str(dump_only=True)
    password = fields.Str(required=True, load_only=True, validate=validate.Length(min=8))

    @post_load
    def make_usuario(self, data, **kwargs): # (o make_admin)
        password = data.pop("password")
        nuevo_usuario = Usuario(**data) # (o Administrador)
        nuevo_usuario.set_password(password)
        return nuevo_usuario