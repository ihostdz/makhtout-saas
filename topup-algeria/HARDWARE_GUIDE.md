# TopUp DZ — Architecture Hardware & Déploiement

## Vue d'ensemble

```
┌─────────────────┐      HTTP/HTTPS       ┌──────────────────────┐
│   Utilisateur   │ ◄──────────────────► │  VPS (Frontend + API)│
│   (Navigateur)  │                      │  React + Node/Express │
└─────────────────┘                      └──────────────────────┘
                                                  │
                                                  │ HTTP polling / WebSocket
                                                  ▼
                                         ┌──────────────────────┐
                                         │   Ton PC (Local)     │
                                         │  Agent Python GSM    │
                                         │  Clés USB Huawei     │
                                         │  + SIM DZ            │
                                         └──────────────────────┘
```

---

## 1. Matériel Requis

| Équipement | Quantité | Notes |
|---|---|---|
| Clé USB GSM 3G/4G (Huawei E3372, E3531, ou ZTE MF823) | 1 par opérateur | Une par opérateur DZ (Djezzy, Ooredoo, Mobilis) |
| Carte SIM algérienne active | 1 par clé | Avec crédit suffisant pour les transferts |
| PC Windows/Linux toujours allumé | 1 | Connecté à Internet |
| VPS cloud (OVH, DigitalOcean, Hetzner...) | 1 | Héberge le site + API |

### Clés USB recommandées
- **Huawei E3372** (HiLink) — Très stable, bien supportée sous Windows
- **Huawei E3531** — Bon marché, fiable
- **ZTE MF823** — Alternative viable

> ⚠️ Évite les clés "modem only" sans mode COM/AT. Il faut pouvoir envoyer des commandes AT.

---

## 2. Architecture Logicielle

### A. VPS — Application Web (déjà construite)

**Stack :** React + Vite (static) + API Node.js/Express (optionnel)

**Stockage des commandes :** 
- Pour l'instant : `localStorage` côté client (démo)
- **Production :** Base de données PostgreSQL/MongoDB sur le VPS

**Endpoints API nécessaires :**
```
POST /api/orders          → Créer une commande
GET  /api/orders/pending  → Lister les commandes payées non traitées
POST /api/orders/:id/complete  → Marquer comme terminée
POST /api/orders/:id/fail      → Marquer comme échouée
```

### B. PC Local — Agent GSM

**Rôle :** Interroger l'API du VPS, exécuter les commandes USSD via les clés USB, confirmer le résultat.

**Tech :** Python 3 + `pyserial` + `requests`

---

## 3. Agent Python (PC Local)

### Installation

```bash
pip install pyserial requests
```

### Script : `gsm_agent.py`

```python
import serial
import time
import requests
import re

# Configuration
API_BASE = "https://TON-VPS.COM/api"
API_KEY = "ta_cle_api_secrete"
POLL_INTERVAL = 10  # secondes

# Ports COM des clés USB (à adapter selon ton système)
# Windows: "COM3", "COM4", "COM5"
# Linux: "/dev/ttyUSB0", "/dev/ttyUSB1"
OPERATORS = {
    "djezzy": {"port": "COM3", "ussd_template": "*100*{number}*{amount}#"},
    "ooredoo": {"port": "COM4", "ussd_template": "*102*{number}*{amount}#"},
    "mobilis": {"port": "COM5", "ussd_template": "*103*{number}*{amount}#"},
}

def send_ussd(port, ussd_code):
    """Envoie une commande USSD via la clé USB GSM."""
    try:
        ser = serial.Serial(port, baudrate=115200, timeout=10)
        time.sleep(1)
        
        # Passer en mode texte
        ser.write(b'AT+CUSD=1,"' + ussd_code.encode() + b'",15\r')
        time.sleep(2)
        
        response = ser.read(ser.in_waiting or 1).decode('utf-8', errors='ignore')
        ser.close()
        
        if "OK" in response or "CUSD" in response:
            return True, response
        return False, response
    except Exception as e:
        return False, str(e)

def poll_and_process():
    """Récupère les commandes en attente et les traite."""
    try:
        headers = {"Authorization": f"Bearer {API_KEY}"}
        resp = requests.get(f"{API_BASE}/orders/pending", headers=headers, timeout=10)
        orders = resp.json()
        
        for order in orders:
            op_id = order["operatorId"]
            phone = order["phoneNumber"]
            amount = order["amount"]
            
            cfg = OPERATORS.get(op_id)
            if not cfg:
                print(f"[!] Opérateur inconnu: {op_id}")
                continue
            
            # Construire le code USSD (exemple, à vérifier selon l'opérateur)
            ussd = cfg["ussd_template"].format(number=phone, amount=amount)
            
            print(f"[>] Traitement {order['id']}: {ussd} sur {cfg['port']}")
            success, response = send_ussd(cfg["port"], ussd)
            
            if success:
                requests.post(
                    f"{API_BASE}/orders/{order['id']}/complete",
                    headers=headers,
                    json={"ussdResponse": response},
                    timeout=10
                )
                print(f"[✓] Commande {order['id']} terminée")
            else:
                requests.post(
                    f"{API_BASE}/orders/{order['id']}/fail",
                    headers=headers,
                    json={"error": response},
                    timeout=10
                )
                print(f"[✗] Commande {order['id']} échouée: {response}")
                
    except Exception as e:
        print(f"[!] Erreur polling: {e}")

if __name__ == "__main__":
    print("[*] Agent GSM TopUp DZ démarré")
    while True:
        poll_and_process()
        time.sleep(POLL_INTERVAL)
```

### Démarrage automatique (Windows)

Créer un fichier `start_agent.bat` :
```batch
@echo off
cd C:\topup-agent
python gsm_agent.py
```

Puis ajouter dans le Planificateur de tâches Windows (démarrage automatique).

---

## 4. Commandes USSD par Opérateur (Algérie)

> ⚠️ **IMPORTANT** : Ces codes peuvent changer. Vérifie toujours avec l'opérateur.

### Djezzy
- Transfert de crédit : `*100*NUMERO_DESTINATAIRE*MONTANT#`
- Vérifier solde : `*111#`

### Ooredoo (Nedjma)
- Transfert de crédit : `*102*NUMERO_DESTINATAIRE*MONTANT#` ou `*101#` → menu
- Vérifier solde : `*100#`

### Mobilis
- Transfert de crédit : `*103*NUMERO_DESTINATAIRE*MONTANT#`
- Vérifier solde : `*111#`

### Numéro de téléphone
Le numéro doit être au format : `05XXXXXXXX` ou `06XXXXXXXX` ou `07XXXXXXXX` (sans le +213).

---

## 5. Déploiement sur VPS

### Option A : Static Site (Frontend uniquement)

```bash
# Sur le VPS
cd /var/www/topup-dz
npm run build
# Servir le dossier dist/ avec Nginx
```

### Option B : Fullstack (Frontend + API)

```bash
# Frontend (Nginx)
cp -r dist/* /var/www/html/

# Backend (Node.js + Express)
cd api/
npm install
pm2 start server.js --name topup-api
```

### Exemple de serveur API minimal (`api/server.js`)

```javascript
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let orders = []; // Remplacer par PostgreSQL en production

app.post('/api/orders', (req, res) => {
  const order = { ...req.body, id: 'ORD-' + Date.now(), status: 'pending', createdAt: new Date().toISOString() };
  orders.unshift(order);
  res.json(order);
});

app.get('/api/orders/pending', (req, res) => {
  const pending = orders.filter(o => o.status === 'paid');
  res.json(pending);
});

app.post('/api/orders/:id/complete', (req, res) => {
  const o = orders.find(x => x.id === req.params.id);
  if (o) { o.status = 'completed'; o.completedAt = new Date().toISOString(); }
  res.json(o);
});

app.post('/api/orders/:id/fail', (req, res) => {
  const o = orders.find(x => x.id === req.params.id);
  if (o) o.status = 'failed';
  res.json(o);
});

app.listen(3001, () => console.log('API on :3001'));
```

---

## 6. Sécurité & Bonnes Pratiques

1. **API Key** : Toujours authentifier l'agent GSM avec une clé secrète
2. **HTTPS** : Forcer HTTPS sur le VPS (Let's Encrypt)
3. **Rate limiting** : Limiter les requêtes pour éviter les abus
4. **Validation** : Valider les numéros côté serveur (`/^0[5-7][0-9]{8}$/`)
5. **Logs** : Logger toutes les transactions USSD pour debug/tracabilité
6. **Backup crédit** : Surveiller le solde des SIM DZ pour éviter les échecs

---

## 7. Points de vigilance réglementaires

- Le transfert de crédit mobile est généralement considéré comme un service de **télécommunications**, pas un service financier, mais vérifie la législation de ton pays de résidence
- En Algérie, les opérateurs permettent le transfert P2P entre abonnés du même réseau
- Si tu passes à l'échelle, envisage un partenariat officiel avec les opérateurs

---

## 8. Checklist de mise en production

- [ ] VPS configuré avec Nginx + HTTPS
- [ ] Base de données PostgreSQL connectée
- [ ] API backend déployée et sécurisée
- [ ] Clés USB GSM testées et fonctionnelles
- [ ] Agent Python installé sur PC local
- [ ] Cartes SIM DZ avec crédit suffisant
- [ ] PayPal Business / Coinbase Commerce configuré
- [ ] Page de conditions d'utilisation + politique de confidentialité
- [ ] Support client (email / WhatsApp / Telegram)

---

**Projet :** `C:\Users\HP\makhtout\topup-algeria`
