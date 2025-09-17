from marshmallow import Schema, fields, post_load

from app.models import Reserva


class ReservaSchema(Schema):
    id = fields.Int(dump_only=True)
    fecha_creacion = fields.DateTime(dump_only=True)
    estado = fields.Str()
    comprobante_url = fields.Str()
    valor_alquiler = fields.Float()
    valor_estimado = fields.Float()
    saldo_restante = fields.Float()

    # --- CORRECCIÓN CLAVE ---
    # Le decimos al schema cómo debe mostrar los datos anidados de usuario y fecha.
    usuario = fields.Nested('UsuarioSchema', only=("id", "nombre", "apellido", "correo"), dump_only=True)
    fecha = fields.Nested('FechaSchema', only=("id", "dia"), dump_only=True)

    # Estos campos solo se usan al crear/actualizar una reserva, no al mostrarla.
    usuario_id = fields.Int(required=True, load_only=True)
    fecha_id = fields.Int(required=True, load_only=True)

    @post_load
    def make_reserva(self, data, **kwargs):
        return Reserva(**data)