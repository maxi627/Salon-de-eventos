from marshmallow import Schema, fields, post_load, validate
from app.models import Fecha

class FechaSchema(Schema):
    id = fields.Int(dump_only=True)
    dia = fields.Date(required=True)
    estado = fields.Str(dump_only=True)  # se puede modificar desde backend, no desde el cliente
    usuario_id = fields.Int(dump_only=True)  # opcional, si querés mostrarlo

    @post_load
    def make_fecha(self, data, **kwargs):
        return Fecha(**data)
