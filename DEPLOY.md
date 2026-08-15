# Guide de déploiement Makhtout — Serveur dédié

Ce document décrit le déploiement complet de la plateforme Makhtout sur un serveur dédié (ou VPS) avec Docker Compose, SSL, sauvegardes et sécurité de base.

---

## 1. Architecture cible

```
┌─────────────────────────────────────────────────────────────┐
│                         Serveur dédié                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Nginx     │  │   Next.js   │  │      FastAPI        │  │
│  │  + Certbot  │  │   Frontend  │  │      Backend        │  │
│  │  (reverse   │  │   :3000     │  │      :8000          │  │
│  │   proxy)    │  └─────────────┘  └─────────────────────┘  │
│  │   :443/80   │           │                    │            │
│  └──────┬──────┘           │                    │            │
│         │                  └────────────────────┘            │
│         │                           │                        │
│         └───────────────────────────┘                        │
│                                     │                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ PostgreSQL  │  │    Redis    │  │       MinIO         │  │
│  │    :5432    │  │    :6379    │  │    :9000 / :9001    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Prérequis matériels recommandés

| Environnement | CPU | RAM | Stockage |
|---------------|-----|-----|----------|
| MVP / test    | 4 cœurs | 8 Go | 100 Go SSD |
| Production    | 8 cœurs | 16 Go | 250 Go SSD |

- OS : Ubuntu 22.04 LTS (recommandé) ou Debian 12
- Docker Engine 24+ et Docker Compose 2.20+
- Nom de domaine pointant vers le serveur
- Ports ouverts : 80, 443, 22 (SSH)

---

## 3. Installation de Docker

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg lsb-release

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker $USER
newgrp docker
```

---

## 4. Préparation du projet

```bash
cd /opt
sudo git clone <URL_DU_REPO> makhtout
cd makhtout
sudo chown -R $USER:$USER .
```

Créer le fichier d'environnement à la racine :

```bash
cp .env.example .env
nano .env
```

Variables minimales à personnaliser :

```env
# Base de données
DATABASE_URL=postgresql://makhtout:__MOT_DE_PASSE_FORT__@postgres:5432/makhtout_db
POSTGRES_PASSWORD=__MOT_DE_PASSE_FORT__

# Sécurité
SECRET_KEY=__CLE_ALEATOIRE_32_CARACTERES_MIN__

# MinIO
MINIO_ROOT_PASSWORD=__MOT_DE_PASSE_FORT__
MINIO_SECRET_KEY=__MOT_DE_PASSE_FORT__

# Application
FRONTEND_URL=https://ton-domaine.com
NEXT_PUBLIC_API_URL=https://ton-domaine.com/api

# Paiements (optionnel en test)
CHARGILY_API_KEY=
CHARGILY_SECRET=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
```

Générer une clé secrète :

```bash
openssl rand -hex 32
```

---

## 5. Lancement des services

```bash
docker compose up --build -d
```

Vérifier l'état :

```bash
docker compose ps
docker compose logs -f backend
```

Le backend crée automatiquement le bucket MinIO au démarrage.

---

## 6. Création du premier administrateur

```bash
cd backend
docker compose exec backend python -m scripts.create_admin admin@ton-domaine.com "MotDePasseTrèsFort" -n "Administrateur Makhtout"
```

Puis se connecter à l'application avec cet e-mail.

---

## 7. Reverse proxy + SSL avec Nginx et Certbot

Installer Nginx et Certbot :

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Créer `/etc/nginx/sites-available/makhtout` :

```nginx
server {
    listen 80;
    server_name ton-domaine.com www.ton-domaine.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }
}
```

Activer et obtenir le certificat SSL :

```bash
sudo ln -s /etc/nginx/sites-available/makhtout /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d ton-domaine.com -d www.ton-domaine.com
```

Certbot renouvelle automatiquement le certificat.

---

## 8. Sécurité

- Changer tous les mots de passe par défaut du `.env`.
- Désactiver la connexion root SSH ; utiliser une clé SSH.
- Configurer un pare-feu `ufw` :

```bash
sudo ufw default deny incoming
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

- Bloquer l'accès direct aux ports 8000, 3000, 5432, 9000, 9001 depuis l'extérieur.
- Activer les mises à jour automatiques de sécurité :

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

- Le backend utilise déjà des index SQL, des tokens JWT à durée limitée et une validation des webhooks de paiement.

---

## 9. Sauvegardes

Sauvegardes quotidiennes de PostgreSQL, MinIO et les modèles IA :

```bash
sudo mkdir -p /opt/backups/makhtout
```

Script `/opt/backups/backup-makhtout.sh` :

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/opt/backups/makhtout

docker compose -f /opt/makhtout/docker-compose.yml exec -T postgres pg_dump -U makhtout makhtout_db > $BACKUP_DIR/db_$DATE.sql

tar czf $BACKUP_DIR/minio_$DATE.tar.gz -C /var/lib/docker/volumes/makhtout_minio_data/_data .
tar czf $BACKUP_DIR/models_$DATE.tar.gz -C /var/lib/docker/volumes/makhtout_ai_models/_data .

find $BACKUP_DIR -type f -mtime +7 -delete
```

Rendre exécutable et planifier via cron :

```bash
chmod +x /opt/backups/backup-makhtout.sh
sudo crontab -e
```

Ajouter :

```
0 3 * * * /opt/backups/backup-makhtout.sh >> /var/log/makhtout-backup.log 2>&1
```

---

## 10. Mise à jour

```bash
cd /opt/makhtout
git pull origin main
docker compose down
docker compose up --build -d
docker compose exec backend alembic upgrade head  # si des migrations existent
```

---

## 11. SEO / Performance

- Le sitemap et le manifest PWA sont générés par le frontend Next.js.
- Utiliser `next-intl` pour les URLs bilingues `/fr` et `/ar`.
- Compresser les images uploadées par les utilisateurs (optimisation future côté backend).
- Activer le cache Nginx pour les assets statiques :

```nginx
location /_next/static {
    alias /opt/makhtout/frontend/.next/static;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## 12. Surveillance (optionnel)

Pour un MVP, surveiller les logs est suffisant :

```bash
docker compose logs -f --tail 100
```

En production, ajouter :

- **Prometheus + Grafana** pour les métriques
- **Uptime Kuma** ou **StatusCake** pour la disponibilité
- **Fail2ban** contre les attaques par force brute sur SSH et l'API login

---

## 13. Accès après déploiement

| Service | URL |
|---------|-----|
| Application | `https://ton-domaine.com` |
| API docs | `https://ton-domaine.com/docs` |
| Console MinIO | `http://localhost:9001` (local uniquement) |

---

## 15. Déploiement sur VPS Contabo

Pour un guide pas à pas complet (connexion initiale, durcissement SSH, DNS, HTTPS, pare-feu, sauvegardes), voir [`VPS_SETUP.md`](./VPS_SETUP.md).

## 16. Notes importantes

- L'export PDF utilise Helvetica ; l'arabe nécessite une police TTF arab-supportée pour un rendu parfait (amélioration phase 2).
- Les paiements Chargily/PayPal nécessitent des clés API réelles pour activer les webhooks.
- Le fine-tuning TrOCR est préparé dans `ai/finetune_trocr.py` ; il demande un GPU pour entraîner efficacement.
