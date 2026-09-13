# Builder stage: installe les dépendances de build et compile les modules natifs.
FROM node:22-alpine AS builder

WORKDIR /app

# Installer paquets nécessaires à la compilation de better-sqlite3
RUN apk add --no-cache build-base python3 sqlite-dev

# Copier les manifests et installer dépendances
COPY package*.json ./
RUN npm install --omit=dev

# Copier le reste du code
COPY . .

############################################################
# Runtime stage: image plus légère, sans dépendances de build
FROM node:22-alpine AS runtime

WORKDIR /app

# Créer un utilisateur non-root pour exécuter le processus
RUN addgroup -S app && adduser -S app -G app

# Copier l'application et les node_modules depuis le builder
COPY --from=builder /app /app

# Créer dossier data et définir ownership pour l'utilisateur "app"
RUN mkdir -p /app/data && chown -R app:app /app

ENV NODE_ENV=production
USER app

EXPOSE 3000

# Healthcheck simple
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "const http=require('http');http.get('http://127.0.0.1:3000/healthz',res=>process.exit(res.statusCode===200?0:1)).on('error',()=>process.exit(1));"

CMD ["node", "-r", "dotenv/config", "serveur.js"]
