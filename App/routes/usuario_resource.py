from flask import Blueprint, request
from marshmallow import ValidationError

from app import limiter  # Usar el limiter global
from app.config import ResponseBuilder
from app.mapping import ResponseSchema, UsuarioSchema
from app.services import ResponseBuilder, UsuarioService

Usuario = Blueprint('Usuario', __name__)
service = UsuarioService()
usuario_schema = UsuarioSchema()
response_schema = ResponseSchema()

# Aplicar limitadores específicos en las rutas
@Usuario.route('/usuario', methods=['GET'])
@limiter.limit("5 per minute")
def all():
    response_builder = ResponseBuilder()
    try:
        data = usuario_schema.dump(service.all(), many=True)
        response_builder.add_message("Usuario found").add_status_code(200).add_data(data)
        return response_schema.dump(response_builder.build()), 200
    except Exception as e:
        response_builder.add_message("Error fetching Usuario").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500

@Usuario.route('/usuario/<int:id>', methods=['GET'])
@limiter.limit("5 per minute")
def one(id):
    response_builder = ResponseBuilder()
    try:
        data = service.find(id)
        if data:
            serialized_data = usuario_schema.dump(data)
            response_builder.add_message("Usuario found").add_status_code(200).add_data(serialized_data)
            return response_schema.dump(response_builder.build()), 200
        else:
            response_builder.add_message("Usuario not found").add_status_code(404).add_data({'id': id})
            return response_schema.dump(response_builder.build()), 404
    except Exception as e:
        response_builder.add_message("Error fetching Usuario").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500

@Usuario.route('/usuario', methods=['POST'])
@limiter.limit("5 per minute")
def add():
    response_builder = ResponseBuilder()
    try:
        json_data = request.json
        if not json_data:
            raise ValidationError("No data provided")

        usuario = usuario_schema.load(json_data)
        data = usuario_schema.dump(service.add(usuario))
        response_builder.add_message("Usuario created").add_status_code(201).add_data(data)
        return response_schema.dump(response_builder.build()), 201
    except ValidationError as err:
        response_builder.add_message("Validation error").add_status_code(422).add_data(err.messages)
        return response_schema.dump(response_builder.build()), 422
    except Exception as e:
        response_builder.add_message("Error creating Usuario").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500

@Usuario.route('/usuario/<int:id>', methods=['PUT'])
@limiter.limit("5 per minute")
def update(id):
    response_builder = ResponseBuilder()
    try:
        json_data = request.json
        if not json_data:
            raise ValidationError("No data provided")

        usuario = usuario_schema.load(json_data)
        updated_usuario = service.update(id, usuario)
        if not updated_usuario:
            response_builder.add_message("Usuario not found").add_status_code(404).add_data({'id': id})
            return response_schema.dump(response_builder.build()), 404

        data = usuario_schema.dump(updated_usuario)
        response_builder.add_message("Usuario updated").add_status_code(200).add_data(data)
        return response_schema.dump(response_builder.build()), 200
    except ValidationError as err:
        response_builder.add_message("Validation error").add_status_code(422).add_data(err.messages)
        return response_schema.dump(response_builder.build()), 422
    except Exception as e:
        response_builder.add_message("Error updating Usuario").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500

@Usuario.route('/usuario/<int:id>', methods=['DELETE'])
@limiter.limit("3 per minute")
def delete(id):
    response_builder = ResponseBuilder()
    try:
        if service.delete(id):
            response_builder.add_message("Usuario deleted").add_status_code(200).add_data({'id': id})
            return response_schema.dump(response_builder.build()), 200
        else:
            response_builder.add_message("Usuario not found").add_status_code(404).add_data({'id': id})
            return response_schema.dump(response_builder.build()), 404
    except Exception as e:
        response_builder.add_message("Error deleting Usuario").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500
@Usuario.route('/usuario/<int:id>/manage', methods=['POST'])
@limiter.limit("5 per minute")
def manage(id):
    response_builder = ResponseBuilder()
    try:
        json_data = request.json
        if not json_data or 'cantidad' not in json_data:
            raise ValidationError("Cantidad no proporcionada")

        cantidad = json_data['cantidad']
        
        # Llamar a la función de gestión de usuario
        updated_usuario = service.manage_usuario(id, cantidad)

        # Devolver el usuario actualizado
        response_builder.add_message("Usuario updated").add_status_code(200).add_data(updated_usuario)
        return response_schema.dump(response_builder.build()), 200

    except ValidationError as err:
        response_builder.add_message("Validation error").add_status_code(422).add_data(err.messages)
        return response_schema.dump(response_builder.build()), 422
    except Exception as e:
        response_builder.add_message("Error managing usuario").add_status_code(500).add_data(str(e))
        return response_schema.dump(response_builder.build()), 500
