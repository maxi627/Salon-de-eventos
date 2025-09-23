# Imagen base de Python
FROM python:3.10-slim-bullseye

# 1. Instalar dependencias del sistema Y configurar locales en un solo paso
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    locales \
    gcc \
    libpq-dev \
    pkg-config \
    libpango-1.0-0 \
    libharfbuzz0b \
    libfontconfig1 \
    libpangoft2-1.0-0 && \
    # Configurar el idioma español
    sed -i -e 's/# es_AR.UTF-8 UTF-8/es_AR.UTF-8 UTF-8/' /etc/locale.gen && \
    dpkg-reconfigure --frontend=noninteractive locales && \
    # Limpiar caché de apt
    rm -rf /var/lib/apt/lists/*

# 2. Establecer las variables de entorno
ENV FLASK_ENV=development \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/home/flaskapp \
    LANG=es_AR.UTF-8

# 3. Continuar con el resto del setup
RUN useradd --create-home --home-dir /home/flaskapp flaskapp
WORKDIR /home/flaskapp

COPY requirements.txt .

# Instalar dependencias de Python
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./app/

USER flaskapp

EXPOSE 5000

ENTRYPOINT [ "python", "app/main.py" ]