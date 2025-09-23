Bienvenidos aaaaaaaaaaaaaaaaaaaaj














#Hacer correr el servidor de react
cd frontend
npm run dev

# borrar volumenes de docker
docker-compose -f App/docker-compose.yml down -v

#levantar contenedores
docker-compose -f App/docker-compose.yml up --build