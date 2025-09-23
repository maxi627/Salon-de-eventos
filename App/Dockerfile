# Imagen base de Python
FROM python:3.10-slim-bullseye

# Variables de entorno
ENV FLASK_ENV=development \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/home/flaskapp

# Crear usuario y directorio de trabajo
RUN useradd --create-home --home-dir /home/flaskapp flaskapp
WORKDIR /home/flaskapp

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    pkg-config \
    libpango-1.0-0 \
    libharfbuzz0b \
    libfontconfig1 \
    libpangoft2-1.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copiar solo requirements.txt
COPY requirements.txt .

# --- INICIO DE LA CORRECCIÓN CLAVE ---
# 1. Instalar primero la versión antigua de setuptools que necesitamos
RUN pip install --no-cache-dir "setuptools<58.0.0"

# 2. Instalar el resto de los paquetes FORZANDO a que no se use un entorno aislado
RUN pip install --no-cache-dir --no-build-isolation -r requirements.txt
# --- FIN DE LA CORRECCIÓN CLAVE ---


# Copiar el código de tu aplicación a una carpeta 'app' dentro del workdir
COPY . ./app

# Cambiar de usuario
USER flaskapp

# Exponer puerto
EXPOSE 5000

# Punto de entrada para ejecutar la aplicación
ENTRYPOINT [ "python", "app/main.py" ]