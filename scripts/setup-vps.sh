#!/bin/bash
#
# Script d'installation automatique de Makhtout sur un VPS Contabo (Ubuntu 22.04/24.04)
#
# Usage :
#   1. Connectez-vous en root sur le VPS
#   2. Téléchargez ce script : curl -fsSL https://raw.githubusercontent.com/VOTRE_COMPTE/makhtout/main/scripts/setup-vps.sh -o setup-vps.sh
#   3. chmod +x setup-vps.sh && ./setup-vps.sh
#
# ATTENTION :
#   - Ce script doit être exécuté en root.
#   - Le nom de domaine doit déjà pointer vers l'IP du serveur (enregistrement A).
#   - Remplacez VOTRE_COMPTE/makhtout par l'URL de votre dépôt GitHub.
#

set -euo pipefail

# ─────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────
DOMAIN="makhtout.pro"
APP_USER="makhtout"
APP_DIR="/opt/makhtout"
REPO_URL="https://github.com/VOTRE_COMPTE/makhtout.git"
ADMIN_EMAIL="admin@makhtout.pro"

# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────
log() {
    echo -e "\n[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

gen_pass() {
    openssl rand -base64 32 | tr -d '=+/\n' | cut -c1-24
}

# ─────────────────────────────────────────────────────────────
# Vérifications
# ─────────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
    echo "Ce script doit être exécuté en root."
    exit 1
fi

log "Vérification du nom de domaine..."
if ! nslookup "$DOMAIN" >/dev/null 2>&1; then
    echo "⚠️  Le domaine $DOMAIN ne semble pas encore résolu."
    echo "Assurez-vous que l'enregistrement A pointe vers ce serveur avant de continuer."
    read -p "Continuer quand même ? (yes/no) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# ─────────────────────────────────────────────────────────────
# Mise à jour système
# ─────────────────────────────────────────────────────────────
log "Mise à jour du système..."
export DEBIAN_FRONTEND=noninteractive
apt update && apt upgrade -y
apt install -y curl wget vim gnupg lsb-release ca-certificates software-properties-common apt-transport-https

# ─────────────────────────────────────────────────────────────
# Création de l'utilisateur applicatif
# ─────────────────────────────────────────────────────────────
if ! id "$APP_USER" &>/dev/null; then
    log "Création de l'utilisateur $APP_USER..."
    adduser --gecos "" --disabled-password "$APP_USER"
    usermod -aG sudo "$APP_USER"
fi

# ─────────────────────────────────────────────────────────────
# Docker
# ─────────────────────────────────────────────────────────────
log "Installation de Docker..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
usermod -aG docker "$APP_USER"

# ─────────────────────────────────────────────────────────────
# Pare-feu
# ─────────────────────────────────────────────────────────────
log "Configuration du pare-feu UFW..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ─────────────────────────────────────────────────────────────
# Sécurité automatique
# ─────────────────────────────────────────────────────────────
log "Installation de fail2ban et mises à jour automatiques..."
apt install -y fail2ban unattended-upgrades

cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
EOF

systemctl enable fail2ban
systemctl restart fail2ban

dpkg-reconfigure -plow unattended-upgrades -f noninteractive || true

# ─────────────────────────────────────────────────────────────
# Clonage du projet
# ─────────────────────────────────────────────────────────────
log "Déploiement de Makhtout..."
mkdir -p "$APP_DIR"
chown "$APP_USER:$APP_USER" "$APP_DIR"

if [[ -d "$APP_DIR/.git" ]]; then
    sudo -u "$APP_USER" bash -c "cd $APP_DIR && git pull origin main"
else
    sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR"
fi

# ─────────────────────────────────────────────────────────────
# Génération des secrets
# ─────────────────────────────────────────────────────────────
log "Génération du fichier .env..."
DB_PASS=$(gen_pass)
MINIO_PASS=$(gen_pass)
SECRET_KEY=$(openssl rand -hex 32)
ADMIN_PASS=$(gen_pass)

cat > "$APP_DIR/.env" <<EOF
# Base de données
DATABASE_URL=postgresql://makhtout:${DB_PASS}@postgres:5432/makhtout_db
POSTGRES_USER=makhtout
POSTGRES_PASSWORD=${DB_PASS}
POSTGRES_DB=makhtout_db

# Cache & files
REDIS_URL=redis://redis:6379/0

# Stockage objet (MinIO)
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=makhtout
MINIO_SECRET_KEY=${MINIO_PASS}
MINIO_BUCKET=documents
MINIO_ROOT_USER=makhtout
MINIO_ROOT_PASSWORD=${MINIO_PASS}

# Sécurité JWT
SECRET_KEY=${SECRET_KEY}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# URLs publiques
FRONTEND_URL=https://${DOMAIN}
NEXT_PUBLIC_API_URL=https://${DOMAIN}/api
NEXT_PUBLIC_APP_URL=https://${DOMAIN}
NEXT_PUBLIC_APP_NAME=Makhtout

# Paiements (à remplir plus tard)
CHARGILY_API_KEY=
CHARGILY_SECRET=
CHARGILY_BASE_URL=https://pay.chargily.net/test/api/v2

PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
EOF

chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"

# ─────────────────────────────────────────────────────────────
# Lancement des conteneurs
# ─────────────────────────────────────────────────────────────
log "Démarrage de Makhtout avec Docker Compose..."
sudo -u "$APP_USER" bash -c "cd $APP_DIR && docker compose down || true"
sudo -u "$APP_USER" bash -c "cd $APP_DIR && docker compose up --build -d"

# Attente que le backend soit prêt
log "Attente du backend (30s max)..."
for i in {1..30}; do
    if sudo -u "$APP_USER" bash -c "cd $APP_DIR && docker compose exec -T backend python -c 'print(1)'" >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

# ─────────────────────────────────────────────────────────────
# Nginx + Certbot
# ─────────────────────────────────────────────────────────────
log "Installation de Nginx et Certbot..."
apt install -y nginx certbot python3-certbot-nginx

cat > /etc/nginx/sites-available/makhtout <<'EOF'
server {
    listen 80;
    server_name makhtout.pro www.makhtout.pro;

    client_max_body_size 50M;

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
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/makhtout /etc/nginx/sites-enabled/makhtout

nginx -t
systemctl reload nginx

log "Obtention du certificat SSL..."
certbot --nginx --non-interactive --agree-tos --redirect -m "$ADMIN_EMAIL" -d "$DOMAIN" -d "www.$DOMAIN" || true

# Cache Next.js
if ! grep -q "/_next/static" /etc/nginx/sites-available/makhtout; then
    sed -i '/proxy_cache_bypass/a\\n    location /_next/static {\n        alias /opt/makhtout/frontend/.next/static;\n        expires 1y;\n        add_header Cache-Control "public, immutable";\n    }' /etc/nginx/sites-available/makhtout
    nginx -t && systemctl reload nginx
fi

# ─────────────────────────────────────────────────────────────
# Création de l'admin
# ─────────────────────────────────────────────────────────────
log "Création du compte administrateur..."
sudo -u "$APP_USER" bash -c "cd $APP_DIR/backend && docker compose exec -T backend python -m scripts.create_admin $ADMIN_EMAIL \"$ADMIN_PASS\" -n 'Administrateur Makhtout'" || true

# ─────────────────────────────────────────────────────────────
# Sauvegardes automatiques
# ─────────────────────────────────────────────────────────────
log "Configuration des sauvegardes..."
mkdir -p /opt/backups/makhtout

cat > /opt/backups/backup-makhtout.sh <<EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/opt/backups/makhtout
cd $APP_DIR

sudo -u $APP_USER bash -c "cd $APP_DIR && docker compose exec -T postgres pg_dump -U makhtout makhtout_db" > "\$BACKUP_DIR/db_\$DATE.sql"
tar czf "\$BACKUP_DIR/minio_\$DATE.tar.gz" -C /var/lib/docker/volumes/makhtout_minio_data/_data . 2>/dev/null || true
tar czf "\$BACKUP_DIR/models_\$DATE.tar.gz" -C /var/lib/docker/volumes/makhtout_ai_models/_data . 2>/dev/null || true
find "\$BACKUP_DIR" -type f -mtime +7 -delete
EOF

chmod +x /opt/backups/backup-makhtout.sh

if ! crontab -l 2>/dev/null | grep -q backup-makhtout; then
    (crontab -l 2>/dev/null || true; echo "0 3 * * * /opt/backups/backup-makhtout.sh >> /var/log/makhtout-backup.log 2>&1") | crontab -
fi

# ─────────────────────────────────────────────────────────────
# Récapitulatif
# ─────────────────────────────────────────────────────────────
log "Installation terminée !"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Domaine      : https://$DOMAIN"
echo "  API Docs     : https://$DOMAIN/docs"
echo "  Admin email  : $ADMIN_EMAIL"
echo "  Admin pass   : $ADMIN_PASS"
echo ""
echo "  Fichier .env : $APP_DIR/.env"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Prochaines étapes recommandées :"
echo "  1. Configurez une clé SSH et désactivez PasswordAuthentication."
echo "  2. Vérifiez que makhtout.pro pointe bien sur 169.58.183.188."
echo "  3. Testez l'inscription et l'OCR sur https://$DOMAIN."
echo "  4. Configurez vos clés Chargily/PayPal dans $APP_DIR/.env."
