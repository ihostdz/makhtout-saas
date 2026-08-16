# Makhtout — SaaS de reconnaissance de manuscrits arabes/français

Makhtout est une plateforme de reconnaissance de manuscrits (HTR/OCR) 100 % self-hostée, bilingue français/arabe, conçue pour le marché algérien et maghrébin.

## Stack technique

- **Frontend** : Next.js 14 + TailwindCSS + shadcn/ui
- **Backend** : FastAPI + SQLAlchemy + Alembic
- **Base de données** : PostgreSQL 16
- **Cache / Jobs** : Redis + Celery
- **Stockage fichiers** : MinIO (compatible S3)
- **OCR/HTR** : PaddleOCR (fallback) + structure pour TrOCR
- **Authentification** : JWT
- **Conteneurs** : Docker + Docker Compose

## Démarrage rapide

### Prérequis

- Docker Desktop ou Docker Engine + Docker Compose
- Au moins 8 Go de RAM disponibles

### Lancer l'application

```bash
docker-compose up --build
```

Accès :

- Application : http://localhost:3000
- API : http://localhost:8000
- Documentation API : http://localhost:8000/docs
- Console MinIO : http://localhost:9001

### Buckets MinIO

Le backend crée automatiquement le bucket `documents` au démarrage. Vous pouvez tout de même consulter la console MinIO à http://localhost:9001 avec :

- Utilisateur : `makhtout`
- Mot de passe : `makhtout_secret`

### Arrêter l'application

```bash
docker-compose down
```

Pour supprimer les volumes (données) :

```bash
docker-compose down -v
```

## Structure du projet

```
.
├── ai/                 # Scripts OCR/HTR et modèles
├── backend/            # API FastAPI
├── frontend/           # Application Next.js
├── docker-compose.yml
└── README.md
```

## Roadmap

- [x] Phase 0 : Fondations techniques + page d'accueil
- [x] Phase 1 : Upload, OCR basique, authentification, correction utilisateur
- [x] Phase 2 : Modes avancés, validation admin ML, pipeline d'entraînement
- [x] Phase 3 : Abonnements, paiement (Chargily/PayPal), SEO, PWA
- [x] Phase 4 : Hardening, export des transcriptions, admin paiements, déploiement
- [x] Phase 5 : Tests E2E, OCR arabe optimisé, CI/CD, landing SEO/marketing

## Fonctionnalités actuelles

- Inscription / connexion JWT
- Upload d'images et PDF (drag & drop + capture photo)
- OCR multi-modes : Machine, Humain-like, par mots, par lettres, par contexte
- Prétraitement optimisé pour l'arabe manuscrit (contraste, débruitage, binarisation adaptative)
- Visualisation côte à côte image / transcription
- Édition et sauvegarde des corrections
- Suggestions IA pour les mots ambigus (CamemBERT / AraBERT)
- Dashboard admin : validation/rejet des corrections avant intégration ML
- Export des corrections validées (JSON/CSV)
- Export des transcriptions en TXT, DOCX et PDF (avec support police arabe)
- Validation admin des paiements manuels (CIB/virement)
- Structure de fine-tuning TrOCR local
- Système d'abonnements avec quotas de pages
- Paiement Chargily (Algérie), PayPal (international), CIB/virement manuel
- Page billing avec suivi du quota
- SEO technique (sitemap, robots, meta tags, Open Graph, Schema.org, blog)
- PWA (manifest) et responsive mobile
- Interface bilingue FR/AR avec RTL
- Page marketing avec plans, témoignages, FAQ, "Comment ça marche", cas d'usage
- Tests backend pytest (auth, documents, OCR, export)
- CI/CD GitHub Actions (tests + build + déploiement SSH/Docker)
- Guide de déploiement serveur dédié (voir `DEPLOY.md`)
- Guide VPS Contabo step-by-step (voir `VPS_SETUP.md`)
- Script d'installation automatique VPS (voir `scripts/setup-vps-final.sh`)
- Plan de lancement SEO & marketing (voir `MARKETING.md`)

## Développement

### Tests backend

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest tests/ -q
```

### CI/CD

Les workflows GitHub Actions sont dans `.github/workflows/` :

- `ci.yml` : tests backend + build frontend à chaque push.
- `deploy.yml` : build/push Docker + déploiement SSH sur `main`.

## Licence

Projet privé — tous droits réservés.
