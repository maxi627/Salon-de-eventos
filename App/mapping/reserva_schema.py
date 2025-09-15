from marshmallow import Schema, fields, post_load, validate
from app.models import Reserva

class ReservaSchema(Schema):
    id = fields.Int(dump_only=True)
    fecha_creacion = fields.DateTime(dump_only=True)
    fecha_vencimiento = fields.DateTime(required=False)
    estado = fields.Str(dump_only=True)  # por defecto es 'pendiente'

    usuario_id = fields.Int(required=True)
    fecha_id = fields.Int(required=True)

    @post_load
    def make_reserva(self, data, **kwargs):
        return Reserva(**data)
