import os

from app import create_app, db
from app.db_arranque import crear_tablas_sin_conexiones_abiertas

# Crear la aplicación
app = create_app()
app.app_context().push()

# Crear las tablas que falten, sin dejar conexiones que hereden los workers de gunicorn
with app.app_context():
    crear_tablas_sin_conexiones_abiertas(db)

# Configurar ejecución según el entorno
if __name__ == "__main__":
    env = os.getenv("FLASK_ENV", "development")
    if env == "production":
        # Usar Gunicorn en producción
        from gunicorn.app.base import BaseApplication

        class GunicornApp(BaseApplication):
            def __init__(self, app, options=None):
                self.options = options or {}
                self.application = app
                super().__init__()

            def load_config(self):
                config = {key: value for key, value in self.options.items() if key in self.cfg.settings and value is not None}
                for key, value in config.items():
                    self.cfg.set(key.lower(), value)

            def load(self):
                return self.application

        options = {
            "bind": "0.0.0.0:5000",
            "workers": 3,  # Número de workers para manejar carga
        }
        GunicornApp(app, options).run()
    else:
        # Usar servidor Flask en desarrollo
        app.run(host="0.0.0.0", port=5000, debug=True)
