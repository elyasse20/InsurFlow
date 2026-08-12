# Image Node.js khfifa (Alpine)
FROM node:20-alpine
WORKDIR /app

# Copier les fichiers dyal les dépendances w n'installiwhom
COPY package*.json ./
RUN npm install

# Copier l'code kaml w n'buildiw l'projet
COPY . .
RUN npm run build

# N7ellou l'port 3000 w n'lanciow l'app
EXPOSE 3000
CMD ["npm", "start"]