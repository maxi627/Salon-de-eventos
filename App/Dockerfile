# Imagen base de Python
FROM python:3.10-slim-bullseye

# Variables de entorno
ENV FLASK_ENV=development \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/home/flaskapp

# Crear usuario y directorio de trabajo
RUN useradd --create-home --home-dir /home/flaskapp flaskapp
WORKDIR /home/flaskapp

# --- INICIO DE LA CORRECCIÓN ---
# Instalar dependencias del sistema, incluyendo el paquete de 'locales'
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

# Configurar el locale para español de Argentina
RUN sed -i -e 's/# es_AR.UTF-8 UTF-8/es_AR.UTF-8 UTF-8/' /etc/locale.gen && \
    dpkg-reconfigure --frontend=noninteractive locales
ENV LANG es_AR.UTF-8
# --- FIN DE LA CORRECCIÓN ---


# Copiar solo requirements.txt
COPY requirements.txt .

# Instalar dependencias de Python
RUN pip install --no-cache-dir "setuptools<58.0.0"
RUN pip install --no-cache-dir --no-build-isolation -r requirements.txt

# Copiar el código de tu aplicación a una carpeta 'app' dentro del workdir
COPY . ./app

# Cambiar de usuario
USER flaskapp

# Exponer puerto
EXPOSE 5000

# Punto de entrada para ejecutar la aplicación
ENTRYPOINT [ "python", "app/main.py" ]