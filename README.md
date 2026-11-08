# Sistema de Gestión — Salón de Eventos
Sistema integral para la administración de reservas, pagos y comunicaciones de un salón de eventos. Incluye frontend en React, API REST con Flask, base de datos PostgreSQL, caché Redis, asistente de chat con Claude, y orquestación completa con Docker y Traefik detrás de Cloudflare.

<p align="center">
  <img src="https://img.shields.io/badge/React_+_Vite-e0f7fa?style=flat&logo=react&logoColor=black&labelColor=e0f7fa&color=e0f7fa" alt="React + Vite" />
  <img src="https://img.shields.io/badge/Flask-e8f5e9?style=flat&logo=flask&logoColor=black&labelColor=e8f5e9&color=e8f5e9" alt="Flask" />
  <img src="https://img.shields.io/badge/PostgreSQL-efebe9?style=flat&logo=postgresql&logoColor=black&labelColor=efebe9&color=efebe9" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-ffebee?style=flat&logo=redis&logoColor=black&labelColor=ffebee&color=ffebee" alt="Redis" />
  <img src="https://img.shields.io/badge/Docker-fff3e0?style=flat&logo=docker&logoColor=black&labelColor=fff3e0&color=fff3e0" alt="Docker" />
  <img src="https://img.shields.io/badge/Traefik-f1f8e9?style=flat&logo=traefik&logoColor=black&labelColor=f1f8e9&color=f1f8e9" alt="Traefik" />
  <img src="https://img.shields.io/badge/Cloudflare-fff8e1?style=flat&logo=cloudflare&logoColor=black&labelColor=fff8e1&color=fff8e1" alt="Cloudflare" />
  <img src="https://img.shields.io/badge/Claude-f3e5f5?style=flat&logo=anthropic&logoColor=black&labelColor=f3e5f5&color=f3e5f5" alt="Claude" />
</p>

<div align="center">

| Frontend | Backend | Base de datos | Caché y colas | Infraestructura | Notificaciones |
|----------|--------|---------------|-------|---------------|-----------------|
| React + Vite (Nginx) | Flask + Celery | PostgreSQL | Redis | Docker + Traefik + Cloudflare | Telegram + Email |

| Archivos | Asistente del chat | Antibots | Monitoreo |
|----------|--------------------|----------|-----------|
| Cloudflare R2 (comprobantes) | Claude Haiku 5.5 (API de Anthropic) | Cloudflare Turnstile | Sentry |

</div>

## Requisitos previos
- Docker y Docker Compose instalados
- Node.js 20.19+ (solo para desarrollo frontend local; Vite 7 no funciona con versiones anteriores)
- Acceso SSH al servidor (KVM)
- Archivo `.env` configurado en `App/` (ver [Configuración de variables de entorno](#configuración-de-variables-de-entorno))


## Entorno de desarrollo local
### Frontend (React + Vite)
El servidor de desarrollo de Vite permite ver cambios en tiempo real con hot-reload. Para levantarlo:

```bash
cd frontend
npm install
npm run dev
```
>Vite consume RAM de forma considerable en modo desarrollo.
>Cerrarlo cuando no esté en uso activo.

En desarrollo se puede usar la clave de prueba de Turnstile (`VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA` en `frontend/.env`) y dejar vacía `TURNSTILE_SECRET_KEY` en el backend, que en ese caso omite la verificación.

#### Para generar una build de producción optimizada (archivos estáticos):
```bash
npm run build
```

### Backend, base de datos e infraestructura (Docker)
El stack completo —PostgreSQL, Redis, Traefik, la aplicación Flask, el worker de Celery y el frontend— está orquestado con Docker Compose.
>Deben asegurarse de tener el archivo .env configurado dentro de App/ antes de ejecutar cualquier comando de Docker.
```bash
# Levantar todos los servicios y reconstruir imágenes
docker compose -f App/docker-compose.yml up --build

# Detener servicios y destruir volúmenes (reset completo de la base de datos)
docker compose -f App/docker-compose.yml down -v
```

## Despliegue en producción (KVM)
Acceso al servidor
```bash
ssh root@<IP_DEL_SERVIDOR>
cd ~/Salon-de-eventos
```
Actualizar desde el repositorio
```bash
# 1. Traer los cambios más recientes
git pull origin main

# 2. Reconstruir y reiniciar solo los servicios afectados (ver tabla)
docker compose -f App/docker-compose.yml build app worker
docker compose -f App/docker-compose.yml up -d app worker

# 3. Ver logs de la aplicación
docker logs salon_app --tail 50
```

<div align="center">

| Qué cambió | Servicios a reconstruir |
|------------|-------------------------|
| Backend (`App/`: rutas, servicios, modelos, plantillas) | `app` y `worker` |
| Solo el manual del asistente (`App/chatbot/manual_salon.md`) | `app` |
| Frontend (`frontend/`) | `frontend` |
| `App/.env` | reiniciar los servicios que usan la variable (`up -d`) |
| Middlewares de Traefik (`App/traefik/dynamic.yml`) | reiniciar `traefik` (`docker compose -f App/docker-compose.yml restart traefik`) |

</div>

>`build` solo genera la imagen nueva: sin `up -d` los contenedores siguen corriendo la versión anterior.

## Configuración de variables de entorno
El archivo `App/.env` se crea a partir del template [`App/.env.example`](App/.env.example), que lista todas las variables con una breve descripción. El frontend tiene su propio [`frontend/.env.example`](frontend/.env.example) (DSN de Sentry y URL de la API).

<div align="center">

| Flask | PostgreSQL | Redis / Celery | Autenticación |
|------|------------|-------|-----|
| Entorno y URL del frontend | Credenciales y URIs | Host, puerto, contraseña y colas | JWT (32+ caracteres) y reseteo de contraseña |

| Cloudflare | R2 | Email / SMTP | Telegram |
|------------|----|-------------|----------|
| Turnstile, token DNS y bloqueo de origen | Bucket de comprobantes | Gmail + App Password | Bot token + Chat IDs |

| Sentry | Asistente del chat | Backups |
|--------|--------------------|---------|
| DSN del backend | API key de Anthropic | Contraseña AES + Rclone |

</div>

>En producción la aplicación no arranca si faltan `PROD_DATABASE_URI`, `JWT_SECRET_KEY`, `REDIS_PASSWORD` o `TURNSTILE_SECRET_KEY`.

>Nunca debemos subir el .env al repositorio. Debemos verificar que este este en el .gitignore para no subir las credenciales.

## Asistente del chat
El chat del sitio usa Claude (por defecto `claude-haiku-5-5`, configurable con `CHATBOT_MODEL`) a través de la API de Anthropic.

- **Contenido:** todo lo que el asistente sabe del salón está en [`App/chatbot/manual_salon.md`](App/chatbot/manual_salon.md). Para cambiar o ampliar respuestas se edita ese archivo y se reconstruye `app`; no hace falta tocar código.
- **Fechas y precios:** el asistente consulta la disponibilidad y el precio estimado en la base de datos, con las mismas reglas que el calendario, y nunca ve datos de clientes ni reservas.
- **Protección:** el visitante pasa Turnstile una vez al abrir el chat y recibe una sesión de 1 hora; además hay límites de mensajes por IP y de largo de la conversación.
- **Sin servicio:** si falta `ANTHROPIC_API_KEY` o la API no responde, el chat deriva a WhatsApp.

## Seguridad
- El dominio está detrás del proxy de Cloudflare (WAF, protección contra bots y SSL). Con `CLOUDFLARE_ORIGIN_LOCK` el servidor solo acepta tráfico que llega desde Cloudflare.
- Los certificados los emite Traefik con Let's Encrypt mediante el desafío DNS de Cloudflare (`CF_DNS_API_TOKEN`).
- Las cabeceras de seguridad y la política de contenido (CSP) se definen en [`App/traefik/dynamic.yml`](App/traefik/dynamic.yml).
- Las acciones públicas sensibles (registro, inicio de sesión, recuperación de contraseña, arrepentimiento, chat) exigen Turnstile y tienen límites de pedidos por IP.
- Los secretos viven solo en `App/.env` del servidor y nunca se versionan.

## Sistema de backups automáticos
El servidor ejecuta [`opt/backup.sh`](opt/backup.sh) cada madrugada. Los backups de PostgreSQL se cifran con AES-256 (`PASSWORD_CIFRADO`) y se sincronizan con Google Drive mediante Rclone.
#### Instalar Rclone
```bash
sudo -v ; curl https://rclone.org/install.sh | sudo bash
```
#### Configurar remote de Google Drive
```bash
rclone config
```
Dado que el servidor es una KVM sin navegador, la autorización con Google se realiza desde una máquina local:

1. En la KVM: iniciar el asistente y crear un nuevo remote llamado gdrive. Indicar que no hay navegador disponible.
2. En la máquina local (con Rclone instalado): ejecutar el comando rclone authorize "drive" que indique la KVM.
3. Autorizar el acceso en el navegador que se abre en la máquina local.
4. Copiar el token generado en la terminal local y pegarlo de vuelta en la KVM.

>El destino de Rclone se configura mediante la variable RCLONE_DESTINO en el .env. Por defecto este sera: gdrive:Backups_Salon/

>Guardar `PASSWORD_CIFRADO` también fuera del servidor: sin ella los backups no se pueden descifrar.

## Estructura del repositorio:
```bash
salon-de-eventos/
├── App/
│   ├── chatbot/          # Manual del asistente del chat (prompt editable)
│   ├── config/           # Configuración por entorno
│   ├── models/           # Modelos SQLAlchemy
│   ├── routes/           # Endpoints de la API (/api/v1)
│   ├── services/         # Lógica de negocio, correos, notificaciones, chat
│   ├── templates/        # Plantillas HTML de los PDF (contrato, reporte contable)
│   ├── traefik/          # Middlewares compartidos de Traefik
│   ├── docker-compose.yml
│   ├── .env.example      # Template de variables de entorno
│   └── .env              # Variables reales (no se versiona)
│
├── frontend/             # Aplicación cliente (React + Vite, servida con Nginx)
│
├── opt/
│   └── backup.sh         # Backup cifrado de PostgreSQL
│
├── .gitignore
└── README.md
```
