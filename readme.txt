
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


