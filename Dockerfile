# Étape 1 : Image de base
FROM node:20

# Étape 2 : Crée le répertoire de l'app
WORKDIR /app

# Étape 3 : Copie les fichiers
COPY package*.json ./
COPY . .

# Étape 4 : Installe les dépendances
RUN npm install

# Étape 5 : Expose le port
EXPOSE 3000

# Étape 6 : Démarre l'application
CMD ["node", "server.js"]
