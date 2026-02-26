# Imagen base de Python
FROM python:3.10-slim-bullseye

# Variables de entorno
ENV FLASK_ENV=production \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/home/flaskapp

# Crear usuario y directorio de trabajo
RUN useradd --create-home --home-dir /home/flaskapp flaskapp
WORKDIR /home/flaskapp

# --- INICIO DE LA CORRECCIÓN LOCALES ---
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    pkg-config \
    libpango-1.0-0 \
    libharfbuzz0b \
    libfontconfig1 \
    libpangoft2-1.0-0 \
    locales \
    && rm -rf /var/lib/apt/lists/*

RUN sed -i -e 's/# es_AR.UTF-8 UTF-8/es_AR.UTF-8 UTF-8/' /etc/locale.gen && \
    dpkg-reconfigure --frontend=noninteractive locales
ENV LANG es_AR.UTF-8
# --- FIN DE LA CORRECCIÓN LOCALES ---

COPY requirements.txt .
RUN pip install --no-cache-dir "setuptools<58.0.0"
RUN pip install --no-cache-dir --no-build-isolation -r requirements.txt

# Copiamos el código a 'app' como siempre hiciste
COPY . ./app

# CREAMOS LA CARPETA DE UPLOADS Y DAMOS PERMISOS
# Debe estar en /home/flaskapp/app/uploads porque tu ENTRYPOINT corre desde /home/flaskapp
USER root
RUN mkdir -p /home/flaskapp/app/uploads/comprobantes && \
    chown -R flaskapp:flaskapp /home/flaskapp/app/uploads
USER flaskapp

EXPOSE 5000

# Tu ENTRYPOINT original que SI funciona
ENTRYPOINT [ "python", "app/main.py" ]