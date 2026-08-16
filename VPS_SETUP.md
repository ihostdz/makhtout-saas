# Configuration complète d'un VPS Contabo pour Makhtout

Ce guide suppose que vous avez :

- Un VPS Contabo sous **Ubuntu 22.04 LTS** (ou 24.04 LTS).
- Une adresse IP publique fournie par Contabo (ex: `203.0.113.10`).
- Un nom de domaine (ex: `makhtout.dz`) chez un registrar (OVH, GoDaddy, Namecheap, etc.).
- Un ordinateur avec un terminal (PowerShell, Terminal, Git Bash).

---

## Étape 1 — Connexion initiale au VPS

Contabo vous a envoyé par e-mail :

- L'**IP du serveur**
- Le **mot de passe root** temporaire

Connectez-vous en SSH depuis votre terminal :

```bash
ssh root@203.0.113.10
```

Tapez le mot de passe fourni.

---

## Version rapide — Script automatique complet

Si vous êtes déjà connecté en `root` et que votre domaine pointe vers le VPS, utilisez le script final qui gère **tout** (Docker, pare-feu, SSL, backups, admin) :

```bash
curl -fsSL https://raw.githubusercontent.com/ihostdz/makhtout-saas/main/scripts/setup-vps-final.sh -o setup-vps-final.sh
chmod +x setup-vps-final.sh
./setup-vps-final.sh
```

Le script dure **20 à 40 minutes** selon la connexion (build lourd PyTorch/PaddleOCR).

Puis reprenez directement à l'**Étape 14** pour vérifier l'accès.

---

## Étape 2 — Mise à jour du système

Dès connecté, mettez à jour tout le système :

```bash
apt update && apt upgrade -y
apt install -y curl wget vim gnupg lsb-release ca-certificates software-properties-common apt-transport-https
```

---

## Étape 3 — Créer un utilisateur admin (non-root)

Ne travaillez plus jamais en root au quotidien.

```bash
adduser makhtout
```

Définissez un mot de passe fort, puis répondez aux questions (ou laissez vide et appuyez sur Entrée).

Ajoutez-le au groupe `sudo` :

```bash
usermod -aG sudo makhtout
```

Vérifiez que l'utilisateur peut devenir sudo :

```bash
su - makhtout
sudo whoami
```

Vous devez voir `root`. Tapez `exit` pour revenir à root.

---

## Étape 4 — Configurer l'accès SSH par clé (recommandé)

Sur **votre ordinateur local**, générez une clé SSH si vous n'en avez pas :

```bash
ssh-keygen -t ed25519 -C "votre-email@example.com"
```

Appuyez sur Entrée pour accepter l'emplacement par défaut (`~/.ssh/id_ed25519`).

Copiez la clé publique sur le serveur :

```bash
ssh-copy-id makhtout@203.0.113.10
```

Testez la connexion sans mot de passe :

```bash
ssh makhtout@203.0.113.10
```

---

## Étape 5 — Durcir SSH

Éditez la configuration SSH :

```bash
sudo nano /etc/ssh/sshd_config
```

Modifiez ou ajoutez ces lignes :

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
```

> ⚠️ Si vous n'avez pas encore configuré de clé SSH, ne mettez PAS `PasswordAuthentication no` tout de suite. Vous seriez bloqué.

Rechargez SSH :

```bash
sudo systemctl restart sshd
```

Dans une nouvelle fenêtre, testez la connexion avec l'utilisateur `makhtout` avant de fermer la session root.

---

## Étape 6 — Configurer le pare-feu (UFW)

Autorisez uniquement les ports essentiels :

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Vérifiez :

```bash
sudo ufw status verbose
```

> **Important :** Dans le panel Contabo, vérifiez aussi qu'il n'y a pas de firewall externe bloquant les ports 80/443.

---

## Étape 7 — Sécurité automatique

### Mises à jour automatiques de sécurité

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-updates
```

Sélectionnez **Oui**.

### Fail2ban (protection contre les attaques par force brute)

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

Créez une règle pour protéger SSH et l'API :

```bash
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
```

Rechargez :

```bash
sudo systemctl restart fail2ban
```

---

## Étape 8 — Installer Docker et Docker Compose

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker makhtout
newgrp docker
```

Vérifiez :

```bash
docker --version
docker compose version
```

---

## Étape 9 — Pointer le nom de domaine vers le VPS

Dans l'interface de votre registrar, ajoutez un enregistrement **A** :

| Type | Hôte | Valeur |
|------|------|--------|
| A | `@` | `203.0.113.10` |
| A | `www` | `203.0.113.10` |

Attendez la propagation DNS (de quelques minutes à 24h). Vérifiez avec :

```bash
nslookup makhtout.dz
```

---

## Étape 10 — Cloner le projet et configurer l'environnement

Connectez-vous avec l'utilisateur `makhtout` :

```bash
ssh makhtout@203.0.113.10
```

Créez un dossier pour l'application et clonez le repo :

```bash
sudo mkdir -p /opt/makhtout
sudo chown makhtout:makhtout /opt/makhtout
cd /opt/makhtout
git clone https://github.com/VOTRE_COMPTE/makhtout.git .
```

> Remplacez l'URL par celle de votre dépôt.

Créez le fichier `.env` :

```bash
cp .env.example .env
nano .env
```

Remplissez au minimum :

```env
# Base de données
DATABASE_URL=postgresql://makhtout:VOTRE_MDP_FORT@postgres:5432/makhtout_db
POSTGRES_PASSWORD=VOTRE_MDP_FORT

# Sécurité JWT
SECRET_KEY=VOTRE_CLE_ALEATOIRE_32_CARACTERES

# MinIO
MINIO_ROOT_PASSWORD=VOTRE_MDP_FORT
MINIO_SECRET_KEY=VOTRE_MDP_FORT

# URLs publiques
FRONTEND_URL=https://makhtout.dz
NEXT_PUBLIC_API_URL=https://makhtout.dz/api
NEXT_PUBLIC_APP_URL=https://makhtout.dz
NEXT_PUBLIC_APP_NAME=Makhtout

# Paiements (optionnel pour commencer)
CHARGILY_API_KEY=
CHARGILY_SECRET=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
```

Générez une clé secrète :

```bash
openssl rand -hex 32
```

---

## Étape 11 — Lancer l'application avec Docker Compose

```bash
cd /opt/makhtout
docker compose up --build -d
```

Vérifiez que tous les conteneurs tournent :

```bash
docker compose ps
docker compose logs -f backend
```

Appuyez sur `Ctrl+C` pour sortir des logs.

---

## Étape 12 — Créer le premier administrateur

```bash
cd /opt/makhtout/backend
docker compose exec backend python -m scripts.create_admin admin@makhtout.dz "VOTRE_MDP_ADMIN" -n "Admin Makhtout"
```

---

## Étape 13 — Installer Nginx et Certbot (HTTPS)

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Créez la configuration Nginx :

```bash
sudo nano /etc/nginx/sites-available/makhtout
```

```nginx
server {
    listen 80;
    server_name makhtout.dz www.makhtout.dz;

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
```

Activez le site :

```bash
sudo ln -s /etc/nginx/sites-available/makhtout /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Obtenez le certificat SSL :

```bash
sudo certbot --nginx -d makhtout.dz -d www.makhtout.dz
```

Suivez les instructions. Choisissez **Redirect** (redirection HTTP → HTTPS).

Certbot renouvelle automatiquement le certificat. Vérifiez :

```bash
sudo certbot renew --dry-run
```

---

## Étape 14 — Vérifier l'accès

Ouvrez votre navigateur :

- https://makhtout.dz
- https://makhtout.dz/docs

Connectez-vous avec l'admin créé.

---

## Étape 15 — Sauvegardes automatiques

Créez un script de sauvegarde :

```bash
sudo mkdir -p /opt/backups/makhtout
sudo nano /opt/backups/backup-makhtout.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/opt/backups/makhtout

cd /opt/makhtout

# Sauvegarde PostgreSQL
docker compose exec -T postgres pg_dump -U makhtout makhtout_db > "$BACKUP_DIR/db_$DATE.sql"

# Sauvegarde MinIO
tar czf "$BACKUP_DIR/minio_$DATE.tar.gz" -C /var/lib/docker/volumes/makhtout_minio_data/_data .

# Sauvegarde modèles IA
tar czf "$BACKUP_DIR/models_$DATE.tar.gz" -C /var/lib/docker/volumes/makhtout_ai_models/_data .

# Suppression des sauvegardes de plus de 7 jours
find "$BACKUP_DIR" -type f -mtime +7 -delete
```

Rendez exécutable et planifiez :

```bash
sudo chmod +x /opt/backups/backup-makhtout.sh
sudo crontab -e
```

Ajoutez :

```
0 3 * * * /opt/backups/backup-makhtout.sh >> /var/log/makhtout-backup.log 2>&1
```

---

## Étape 16 — Optimisations finales

### Cache Nginx pour les assets Next.js

Éditez la config Nginx :

```bash
sudo nano /etc/nginx/sites-available/makhtout
```

Ajoutez dans le bloc `server` :

```nginx
location /_next/static {
    alias /opt/makhtout/frontend/.next/static;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

Rechargez :

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Police arabe pour les PDF (optionnel mais recommandé)

Installez la police Amiri sur le serveur :

```bash
sudo apt install -y fonts-amiri
```

Redémarrez le backend pour qu'il la détecte :

```bash
cd /opt/makhtout && docker compose restart backend
```

---

## Étape 17 — Mise à jour de l'application

Quand vous poussez du code sur `main`, GitHub Actions peut déployer automatiquement si vous avez configuré le workflow `deploy.yml` avec les bons secrets.

Sinon, manuellement :

```bash
cd /opt/makhtout
git pull origin main
docker compose down
docker compose up --build -d
```

---

## Checklist de sécurité

- [ ] Root SSH désactivé (`PermitRootLogin no`)
- [ ] Authentification par mot de passe SSH désactivée (`PasswordAuthentication no`)
- [ ] Clé SSH utilisée pour la connexion
- [ ] UFW actif (ports 22, 80, 443 uniquement)
- [ ] Fail2ban actif
- [ ] Mises à jour automatiques de sécurité activées
- [ ] HTTPS activé avec Certbot
- [ ] Redirection HTTP → HTTPS active
- [ ] Mots de passe forts dans `.env`
- [ ] `SECRET_KEY` aléatoire de 32+ caractères
- [ ] Sauvegardes quotidiennes planifiées
- [ ] Ports 8000, 3000, 5432, 9000, 9001 non exposés publiquement

---

## Dépannage

### Le site ne s'affiche pas

1. Vérifiez DNS : `nslookup makhtout.dz`
2. Vérifiez UFW : `sudo ufw status`
3. Vérifiez Nginx : `sudo systemctl status nginx`
4. Vérifiez les logs : `docker compose logs -f`

### Certbot échoue

- Vérifiez que le port 80 est ouvert.
- Vérifiez que le DNS pointe bien sur le VPS.
- Vérifiez que Nginx est actif.

### Le backend ne démarre pas

```bash
cd /opt/makhtout
docker compose logs backend
```

---

## Liens utiles

- [DEPLOY.md](./DEPLOY.md) — Architecture et déploiement général
- [MARKETING.md](./MARKETING.md) — Plan de lancement
