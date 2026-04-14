# Usar imagem Slim (Debian) em vez de Alpine para compatibilidade com Oracle
FROM node:20-slim

# Instalar libaio1 (dependência obrigatória do Oracle Instant Client) e curl
RUN apt-get update && apt-get install -y libaio1 libnsl2 curl && rm -rf /var/lib/apt/lists/*

# Definir diretório de trabalho
WORKDIR /usr/src/app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências do Node (incluindo oracledb)
RUN npm install

# Copiar o restante do código
COPY . .

# Expõe a porta que o backend utiliza
EXPOSE 3000

# Comando para iniciar o servidor
CMD [ "npm", "start" ]
