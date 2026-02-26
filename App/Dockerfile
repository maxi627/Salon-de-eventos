# Imagen base de Python
FROM python:3.10-slim-bullseye

# Variables de entorno
ENV FLASK_ENV=production \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/home/flaskapp \
    LANG=es_AR.UTF-8

# Crear usuario y directorio de trabajo
RUN useradd --create-home --home-dir /home/flaskapp flaskapp
WORKDIR /home/flaskapp

# Instalar dependencias del sistema y configurar locales
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    pkg-config \
    libpango-1.0-0 \
    libharfbuzz0b \
    libfontconfig1 \
    libpangoft2-1.0-0 \
    locales \
    && sed -i -e 's/# es_AR.UTF-8 UTF-8/es_AR.UTF-8 UTF-8/' /etc/locale.gen \
    && dpkg-reconfigure --frontend=noninteractive locales \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar
COPY requirements.txt .
RUN pip install --no-cache-dir "setuptools<58.0.0" && \
    pip install --no-cache-dir --no-build-isolation -r requirements.txt

# Copiamos todo el contenido directamente en /home/flaskapp
# Según tu imagen, esto incluye la carpeta app/, main.py, etc.
COPY . .

# Aseguramos permisos para las subidas
RUN mkdir -p uploads/comprobantes && chown -R flaskapp:flaskapp /home/flaskapp

USER flaskapp
EXPOSE 5000

# IMPORTANTE: Ejecutamos main:app porque main.py está en la raíz de /home/flaskapp
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "3", "--threads", "2", "main:app"]