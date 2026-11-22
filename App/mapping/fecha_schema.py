from marshmallow import Schema, fields, post_load, validate

from app.models import Fecha


class FechaSchema(Schema):
    id = fields.Int(dump_only=True)
    dia = fields.Date(required=True)
    estado = fields.Str(dump_only=True) 
    estado_noche = fields.Str(dump_only=True)
    usuario_id = fields.Int(dump_only=True)  
    valor_estimado = fields.Float(allow_none=True)
    valor_oferta = fields.Float(allow_none=True, dump_only=True)
    @post_load
    def make_fecha(self, data, **kwargs):
        return Fecha(**data)
