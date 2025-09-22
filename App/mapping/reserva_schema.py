from marshmallow import Schema, fields, post_load

from app.models import Reserva


class ReservaSchema(Schema):
    id = fields.Int(dump_only=True)
    fecha_creacion = fields.DateTime(dump_only=True)
    estado = fields.Str()
    comprobante_url = fields.Str()
    valor_alquiler = fields.Float()
    # SALDO RESTANTE SE QUITA DE AQUÍ PORQUE AHORA ES UNA PROPIEDAD CALCULADA
    ip_aceptacion = fields.Str(dump_only=True)
    fecha_aceptacion = fields.DateTime(dump_only=True)
    version_contrato = fields.Str(dump_only=True)
    
    usuario = fields.Nested('UsuarioSchema', only=("id", "nombre", "apellido", "correo"), dump_only=True)
    fecha = fields.Nested('FechaSchema', only=("id", "dia"), dump_only=True)

    # --- INICIO DE LA MODIFICACIÓN ---
    # Le decimos al schema que incluya una lista de pagos
    pagos = fields.Nested('PagoSchema', many=True, dump_only=True)
    # Añadimos el campo de solo lectura para el saldo restante
    saldo_restante = fields.Float(dump_only=True)
    # --- FIN DE LA MODIFICACIÓN ---

    usuario_id = fields.Int(required=True, load_only=True)
    fecha_id = fields.Int(required=True, load_only=True)

    @post_load
    def make_reserva(self, data, **kwargs):
        return Reserva(**data)