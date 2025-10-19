# 📘 FiveM Full Protection

## 🔧 1. Base de données MySQL
1. Crée une base MySQL (par défaut `fivem_protection`).
2. Importe le fichier `whitelist.sql` :

```bash
mysql -u root -p < whitelist.sql
```

Cela crée la table `whitelist`.

---

## 🤖 2. Bot Discord
### Installation
```bash
cd bot
cp .env.example .env
npm install
```

### Configuration (`.env`)
```ini
DISCORD_TOKEN=ton_token_discord
LOG_CHANNEL_ID=id_du_channel_logs
DB_HOST=localhost
DB_USER=root
DB_PASS=motdepasse
DB_NAME=fivem_protection
PORT=3000
```

### Lancement
```bash
npm start
```

Le bot démarre, se connecte à Discord et ouvre l’API sur `http://localhost:3000`.

### Commandes Discord
- `!addip <ip> <jours>` → ajoute une IP pour une durée donnée.
- `!removeip <ip>` → supprime une IP.
- `!listip` → liste toutes les IP autorisées.
- `!cleanips` → supprime les IP expirées.

📌 Statut du bot = 👀 nombre d’IP actives.

---

## 🌐 3. Panel Web
### Installation
```bash
cd panel
cp .env.example .env
npm install
```

### Configuration (`.env`)
```ini
DB_HOST=localhost
DB_USER=root
DB_PASS=motdepasse
DB_NAME=fivem_protection
ADMIN_PASS=tonmotdepasseadmin
PORT=4000
```

### Lancement
```bash
npm start
```

Le panel est dispo sur **http://localhost:4000**

### Fonctions
- 📋 Voir la liste des IP avec leur date d’expiration.  
- ➕ Ajouter une IP (avec durée).  
- 🗑 Supprimer une IP.  
- 🧹 Nettoyer les IP expirées.  

---

## 🎮 4. Ressource FiveM
### Installation
1. Copie `resource_protection/` dans ton dossier `resources/`.
2. Dans `server.lua`, configure l’URL de l’API du bot :
```lua
local botApiUrl = "http://127.0.0.1:3000"
```
3. Ajoute dans ton `server.cfg` :
```
ensure resource_protection
```

### Fonctionnement
- À chaque lancement, la ressource récupère l’IP publique du serveur.  
- Vérifie si elle est whitelisted via le bot (`/checkip`).  
- ❌ Si non → la ressource se stoppe et un log est envoyé sur Discord.  
- ✅ Si oui → la ressource reste active.  

---

## ✅ Résumé
- **Base MySQL** centralise les IP.  
- **Bot Discord** gère l’API + commandes Discord + logs.  
- **Panel Web** gère les IP via une interface.  
- **Ressource FiveM** s’auto-protège et envoie les logs.  
