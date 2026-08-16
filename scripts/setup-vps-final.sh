#!/bin/bash
#
# Script d'installation complète et robuste de Makhtout sur VPS Contabo
# Usage: ./setup-vps-final.sh
#

set -euo pipefail

# ─────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────
DOMAIN="makhtout.pro"
APP_USER="deploy"
APP_DIR="/home/deploy/app"
REPO_URL="https://github.com/ihostdz/makhtout-saas.git"
ADMIN_EMAIL="admin@makhtout.pro"

# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────
log() { echo -e "\n[$(date +'%Y-%m-%d %H:%M:%S')] $1"; }
gen_pass() { openssl rand -base64 32 | tr -d '=+/\n' | cut -c1-24; }

# ─────────────────────────────────────────────────────────────
# Vérifications
# ─────────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then echo "Exécuter en root."; exit 1; fi
if ! id "$APP_USER" &>/dev/null; then echo "Utilisateur $APP_USER inexistant."; exit 1; fi

log "Vérification DNS..."
if ! nslookup "$DOMAIN" >/dev/null 2>&1; then
    echo "⚠️  $DOMAIN ne résout pas. Configure l'enregistrement A avant de continuer."
    read -p "Continuer quand même ? (yes/no): " -n 1 -r; echo
    [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
fi

# ─────────────────────────────────────────────────────────────
# Système
# ─────────────────────────────────────────────────────────────
log "Mise à jour système..."
export DEBIAN_FRONTEND=noninteractive
apt update && apt upgrade -y
apt install -y curl wget vim gnupg lsb-release ca-certificates software-properties-common apt-transport-https net-tools

# ─────────────────────────────────────────────────────────────
# Docker
# ─────────────────────────────────────────────────────────────
log "Installation Docker..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
apt update && apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
usermod -aG docker "$APP_USER"

# ─────────────────────────────────────────────────────────────
# Pare-feu
# ─────────────────────────────────────────────────────────────
log "Configuration UFW..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ─────────────────────────────────────────────────────────────
# Sécurité
# ─────────────────────────────────────────────────────────────
log "Sécurité automatique..."
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
systemctl enable fail2ban && systemctl restart fail2ban
dpkg-reconfigure -plow unattended-upgrades -f noninteractive || true

# ─────────────────────────────────────────────────────────────
# Projet
# ─────────────────────────────────────────────────────────────
log "Déploiement du projet..."
if [[ -d "$APP_DIR/.git" ]]; then
    sudo -u "$APP_USER" bash -c "cd $APP_DIR && git reset --hard && git pull origin main"
elif [[ -d "$APP_DIR" ]]; then
    rm -rf "$APP_DIR"
    sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR"
else
    sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR"
fi
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ─────────────────────────────────────────────────────────────
# Secrets
# ─────────────────────────────────────────────────────────────
if [[ -f "$APP_DIR/.env" ]]; then
    log "Fichier .env existant trouvé, utilisation des variables existantes."
    source "$APP_DIR/.env"
    DB_PASS="${POSTGRES_PASSWORD:-$(gen_pass)}"
    MINIO_PASS="${MINIO_SECRET_KEY:-$(gen_pass)}"
    SECRET_KEY="${SECRET_KEY:-$(openssl rand -hex 32)}"
    ADMIN_PASS="${ADMIN_PASSWORD:-$(gen_pass)}"
else
    log "Génération .env..."
    DB_PASS=$(gen_pass)
    MINIO_PASS=$(gen_pass)
    SECRET_KEY=$(openssl rand -hex 32)
    ADMIN_PASS=$(gen_pass)
fi

cat > "$APP_DIR/.env" <<EOF
DATABASE_URL=postgresql://makhtout:${DB_PASS}@postgres:5432/makhtout_db
POSTGRES_USER=makhtout
POSTGRES_PASSWORD=${DB_PASS}
POSTGRES_DB=makhtout_db
REDIS_URL=redis://redis:6379/0
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=makhtout
MINIO_SECRET_KEY=${MINIO_PASS}
MINIO_BUCKET=documents
MINIO_ROOT_USER=makhtout
MINIO_ROOT_PASSWORD=${MINIO_PASS}
SECRET_KEY=${SECRET_KEY}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
FRONTEND_URL=https://${DOMAIN}
NEXT_PUBLIC_API_URL=https://${DOMAIN}
NEXT_PUBLIC_APP_URL=https://${DOMAIN}
NEXT_PUBLIC_APP_NAME=Makhtout
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASS}
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
# Certificat auto-signé temporaire
# ─────────────────────────────────────────────────────────────
log "Certificat auto-signé temporaire..."
sudo -u "$APP_USER" bash -c "cd $APP_DIR && mkdir -p ssl && openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ssl/key.pem -out ssl/cert.pem -subj '/CN=${DOMAIN}' -addext 'subjectAltName=DNS:${DOMAIN},DNS:www.${DOMAIN}'"

# ─────────────────────────────────────────────────────────────
# Lancement application
# ─────────────────────────────────────────────────────────────
log "Build et démarrage (peut durer 20-40 min)..."
sudo -u "$APP_USER" bash -c "cd $APP_DIR && docker compose -f docker-compose.prod.yml down || true"
sudo -u "$APP_USER" bash -c "cd $APP_DIR && docker compose -f docker-compose.prod.yml up --build -d"

log "Attente des services..."
for i in {1..60}; do
    if sudo -u "$APP_USER" bash -c "cd $APP_DIR && docker compose -f docker-compose.prod.yml ps | grep -q 'healthy'"; then
        break
    fi
    sleep 5
done

# ─────────────────────────────────────────────────────────────
# Let's Encrypt
# ─────────────────────────────────────────────────────────────
log "Tentative Let's Encrypt..."
apt install -y certbot
if certbot certonly --standalone --non-interactive --agree-tos --no-eff-email -m "$ADMIN_EMAIL" -d "$DOMAIN" -d "www.$DOMAIN" 2>/dev/null; then
    log "Certificat Let's Encrypt obtenu. Mise à jour Nginx..."
    sed -i "s|/etc/nginx/ssl/cert.pem|/etc/letsencrypt/live/${DOMAIN}/fullchain.pem|" "$APP_DIR/nginx.conf"
    sed -i "s|/etc/nginx/ssl/key.pem|/etc/letsencrypt/live/${DOMAIN}/privkey.pem|" "$APP_DIR/nginx.conf"
    sed -i 's|./ssl:/etc/nginx/ssl:ro|/etc/letsencrypt:/etc/letsencrypt:ro|' "$APP_DIR/docker-compose.prod.yml"
    sudo -u "$APP_USER" bash -c "cd $APP_DIR && docker compose -f docker-compose.prod.yml up -d nginx"
    (crontab -l 2>/dev/null || true; echo "0 3 * * * certbot renew --quiet && cd $APP_DIR && docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload") | crontab -
else
    log "Let's Encrypt non disponible (probablement DNS pas propagé). Certificat auto-signé utilisé."
fi

# ─────────────────────────────────────────────────────────────
# Création admin
# ─────────────────────────────────────────────────────────────
log "Création compte administrateur..."
sudo -u "$APP_USER" bash -c "cd $APP_DIR && docker compose -f docker-compose.prod.yml --profile init run --rm init" || true

# ─────────────────────────────────────────────────────────────
# Sauvegardes
# ─────────────────────────────────────────────────────────────
log "Configuration sauvegardes..."
mkdir -p /opt/backups/makhtout
cat > /opt/backups/backup-makhtout.sh <<EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/opt/backups/makhtout
cd $APP_DIR
sudo -u $APP_USER bash -c "cd $APP_DIR && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U makhtout makhtout_db" > "\$BACKUP_DIR/db_\$DATE.sql"
tar czf "\$BACKUP_DIR/minio_\$DATE.tar.gz" -C /var/lib/docker/volumes/${APP_DIR##*/}_minio_data/_data . 2>/dev/null || true
tar czf "\$BACKUP_DIR/models_\$DATE.tar.gz" -C /var/lib/docker/volumes/${APP_DIR##*/}_ai_models/_data . 2>/dev/null || true
find "\$BACKUP_DIR" -type f -mtime +7 -delete
EOF
chmod +x /opt/backups/backup-makhtout.sh
if ! crontab -l 2>/dev/null | grep -q backup-makhtout; then
    (crontab -l 2>/dev/null || true; echo "0 3 * * * /opt/backups/backup-makhtout.sh >> /var/log/makhtout-backup.log 2>&1") | crontab -
fi

# ─────────────────────────────────────────────────────────────
# Récap
# ─────────────────────────────────────────────────────────────
log "INSTALLATION TERMINÉE"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Site          : https://${DOMAIN}"
echo "  API Docs      : https://${DOMAIN}/docs"
echo "  Admin email   : ${ADMIN_EMAIL}"
echo "  Admin pass    : ${ADMIN_PASS}"
echo "  .env          : ${APP_DIR}/.env"
echo "═══════════════════════════════════════════════════════════════"
