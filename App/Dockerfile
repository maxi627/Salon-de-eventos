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

# --- SECCIÓN DE COPIA SIMPLIFICADA ---
# Copiar solo requirements.txt (desde la raíz del contexto, que ahora es 'App')
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar TODO el código (desde la raíz del contexto 'App') a la nueva carpeta 'app' del contenedor
COPY . ./app/
# --- FIN DE LA CORRECCIÓN ---

# Cambiar de usuario
USER flaskapp

# Exponer puerto
EXPOSE 5000

ENTRYPOINT [ "python", "app/main.py" ]