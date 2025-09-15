import pytest

from app import create_app, db
from app.models import Usuario
from app.services.usuario_services import UsuarioService


@pytest.fixture
def app():
    app = create_app("testing")  # Asegurate de tener un modo 'testing' en tu config
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def usuario_service():
    return UsuarioService()


def test_agregar_usuario(usuario_service):
    usuario = Usuario(nombre="Juan", apellido="Pérez", dni=12345678, correo="juan@example.com", tipo="usuario")
    agregado = usuario_service.add(usuario)

    assert agregado.id is not None
    assert agregado.nombre == "Juan"


def test_buscar_usuario(usuario_service):
    usuario = Usuario(nombre="Ana", apellido="Gómez", dni=87654321, correo="ana@example.com", tipo="usuario")
    agregado = usuario_service.add(usuario)

    encontrado = usuario_service.find(agregado.id)

    assert encontrado is not None
    assert encontrado.nombre == "Ana"


def test_eliminar_usuario(usuario_service):
    usuario = Usuario(nombre="Carlos", apellido="Lopez", dni=55555555, correo="carlos@example.com", tipo="usuario")
    agregado = usuario_service.add(usuario)

    eliminado = usuario_service.delete(agregado.id)
    assert eliminado is True

    buscado = usuario_service.find(agregado.id)
    assert buscado is None
