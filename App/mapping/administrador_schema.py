from marshmallow import Schema, fields, post_load, validate

from app.models import Administrador


class AdministradorSchema(Schema):
    id = fields.Int(dump_only=True)
    apellido = fields.Str(required=True, validate=validate.Length(min=1))
    correo = fields.Email(required=True)
    dni = fields.Int(required=True, validate=validate.Range(min=1))
    nombre = fields.Str(required=True, validate=validate.Length(min=1))
    tipo = fields.Str(dump_only=True)
    
    # Se usa para recibir la contraseña al crear, pero nunca se mostrará en las respuestas.
    password = fields.Str(required=True, load_only=True, validate=validate.Length(min=8))

    @post_load
    def make_admin(self, data, **kwargs):
        # Extraemos la contraseña del diccionario de datos
        password = data.pop("password")
        
        # Creamos la instancia del administrador con el resto de los datos
        nuevo_admin = Administrador(**data)
        
        # Usamos el método del modelo para crear y asignar el hash seguro
        nuevo_admin.set_password(password)
        
        return nuevo_admin