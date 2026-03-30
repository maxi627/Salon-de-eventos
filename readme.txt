


# Sistema de Gestión - Salón de Eventos

Este repositorio contiene el código fuente para el sistema de gestión del salón de eventos, incluyendo el frontend en React, el backend y la configuración de infraestructura con Docker y Traefik.

##  Entorno de Desarrollo (Local)

Para trabajar en tu propia máquina y probar cambios, sigue estas instrucciones.

### 1. Frontend (React)
El servidor de desarrollo de Vite/React es ideal para ver cambios en tiempo real, pero **ojo: consume bastante RAM**.

Para levantarlo:
```bash
cd frontend
npm install
npm run dev

Si necesitas probar cómo quedaría la versión final optimizada (archivos estáticos):

npm run build

Backend y Base de Datos (Docker)
Todo el ecosistema (PostgreSQL, Redis, Traefik y la App) está orquestado con Docker Compose.

Asegúrate de tener tu archivo .env configurado dentro de la carpeta App/ antes de ejecutar esto.

Para levantar todos los contenedores y construir las imágenes:

docker compose -f App/docker-compose.yml up --build

Si necesitas reiniciar la base de datos desde cero o limpiar el entorno, este comando baja los contenedores y destruye los volúmenes de datos:

docker compose -f App/docker-compose.yml down -v


Sistema de Backups

El servidor cuenta con un script de copias de seguridad automáticas de la base de datos (backup.sh), cifradas con AES-256 y enviadas a Google Drive todas las madrugadas mediante Rclone.

Instalar Rclone en Linux:
sudo -v ; curl [https://rclone.org/install.sh](https://rclone.org/install.sh) | sudo bash

Iniciar la configuración:
rclone config

Acá es donde le pides instrucciones a Dios... en resumen:

Creas un "New remote" llamado gdrive.

Le dices que no tienes navegador web (porque es una KVM).

Te vas a tu notebook con Windows, descargas Rclone localmente, ejecutas el comando rclone authorize "drive" que te da la KVM.

Se abre Google, concedes permisos, copias el token inmenso que te devuelve la terminal de Windows y lo pegas en la KVM. Listo.


##El tema de los certificados y eso... configuralos 

-------------



#YA EN LA KVM
ssh root@"La ip de la kvm"


# 1. Traer los cambios de GitHub
git pull origin main

# 2. Reconstruir la imagen del frontend con el nuevo código (cuando sean sólo cambios del frontend)
docker compose -f App/docker-compose.yml build frontend
