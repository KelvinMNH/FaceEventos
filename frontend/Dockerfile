# Stage 1: Build do Frontend (React/Vite)
FROM node:20-alpine AS build-stage

WORKDIR /usr/src/app

# Instala dependências antes de copiar o código (melhor cache)
COPY package*.json ./
RUN npm install

# Copia o código e faz o build
COPY . .
RUN npm run build

# Stage 2: Servidor Web (Nginx)
FROM nginx:stable-alpine AS production-stage

# Copia os arquivos compilados do estágio anterior
COPY --from=build-stage /usr/src/app/dist /usr/share/nginx/html

# Copia a configuração personalizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
