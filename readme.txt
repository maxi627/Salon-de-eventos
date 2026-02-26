
#Hacer correr el servidor de react (esto sólo para desarrollo, xq consume mucha ram)
cd frontend
npm run dev

# para producción, correr el servidor de react, construyendo archivos estáticos
npm run build

# borrar volumenes de docker
docker-compose -f App/docker-compose.yml down -v

#levantar contenedores
docker-compose -f App/docker-compose.yml up --build

#para usar un puente con ngrok... (mientras no tenemos el hosting)




#YA EN LA KVM
ssh root@"La ip de la kvm"


# 1. Traer los cambios de GitHub 
git pull origin main

# 2. Reconstruir la imagen del frontend con el nuevo código
docker compose -f App/docker-compose.yml build frontend

# 3. Aplicar los cambios y reiniciar los contenedores
docker compose -f App/docker-compose.yml --env-file App/.env up -d