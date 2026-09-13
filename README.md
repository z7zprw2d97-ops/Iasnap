# Iasnap — Messagerie chiffrée avec agent IA

Ce dépôt contient une messagerie chiffrée de bout en bout (client web + agents IA) destinée à être déployée en Docker avec un reverse-proxy TLS (Caddy). J'ai préparé et optimisé les fichiers pour un déploiement facile.

Principales améliorations apportées
- Dockerfile multi‑stage (compilation des modules natifs dans un build stage, image runtime légère)
- Serveur (serveur.js) prêt à l'emploi avec WebSocket, authentification et persistance SQLite
- Script utilitaire pour créer un utilisateur/agent et obtenir son jeton (scripts/create_user.js)
- Compose ready-to-run avec Caddy pour TLS automatique
- Healthcheck, non-root user, volume nommé pour les données

Avant de démarrer (local)
1) Cloner
   git clone https://github.com/z7zprw2d97-ops/Iasnap.git
   cd Iasnap

2) Créer le fichier d'environnement
   cp .env.example .env
   # Remplacez AUTH_SECRET par une valeur forte (ex: openssl rand -hex 32)
   # Ne commitez JAMAIS .env dans le dépôt.

3) (Optionnel) Créer un utilisateur/agent et obtenir son token
   # Exemple : créer un simple utilisateur avec clé publique placeholder
   npm run create-user -- alice
   # La commande affichera le jeton à garder secret. Utilisez ce token pour vous authentifier depuis le client.

4) Build & run avec Docker Compose
   docker compose up -d --build

5) Vérifier
   # Healthcheck
   curl http://127.0.0.1:3000/healthz
   # Accéder à l'interface (si vous exposez via Caddy/domain)
   # Si vous utilisez Caddy, modifiez Caddyfile pour indiquer votre domaine et ouvrez https://votre-domaine

Notes de sécurité
- Le serveur attend que AUTH_SECRET soit disponible via les variables d'environnement (fichier .env est utilisé en local). En production utilisez un gestionnaire de secrets ou les secrets Docker.
- better-sqlite3 est compilé lors du build Docker; si vous build localement assurez-vous d'avoir les dépendances système (build tools et sqlite-dev) si nécessaire.
- Le client stocke la clé privée dans localStorage par défaut — pour la production, durcissez le front avec CSP et considérez IndexedDB.

Fichiers importants
- Dockerfile (multi-stage)
- docker-compose.yml (inclut Caddy)
- Caddyfile (config TLS automatique)
- serveurs.js (serveur HTTP + WebSocket)
- base.js / securite.js (persistence + helpers)
- scripts/create_user.js (création d'utilisateur + affichage du token)

Si vous voulez que j'automatise la création d'utilisateurs initiaux (agents IA) ou que j'ajoute une action CI/CD (workflow GitHub Actions), dites-le et je le pousserai dans une branche et créerai une PR.
