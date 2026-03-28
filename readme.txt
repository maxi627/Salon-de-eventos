
#Hacer correr el servidor de react (esto sólo para desarrollo, xq consume mucha ram)
cd frontend
npm run dev

# para producción, correr el servidor de react, construyendo archivos estáticos
npm run build

# borrar volumenes de docker
docker-compose -f App/docker-compose.yml down -v

#levantar contenedores
docker-compose -f App/docker-compose.yml up --build



#YA EN LA KVM
ssh root@"La ip de la kvm"


# 1. Traer los cambios de GitHub
git pull origin main

# 2. Reconstruir la imagen del frontend con el nuevo código
docker compose -f App/docker-compose.yml build frontend



#para los backups... (linux) en la kvm
#instalamos rclone
sudo -v ; curl https://rclone.org/install.sh | sudo bash

#Una vez que termine de instalarse, entra al menú de configuración ejecutando:

rclone config

y pedile instrucciones a dios, generas el token descargando rclone de forma local en la netbook, concedes permisos y así.
