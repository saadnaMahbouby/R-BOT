# R-BOT — Installation (livraison par image)

Le client reçoit **3 fichiers** (aucun code source) :
- `rbot-release.tar` — les images de l'application
- `docker-compose.delivery.yml` — la configuration de lancement
- `.env.docker` — la configuration (domaines + **sa licence**), préparée par l'éditeur

Pré-requis sur l'instance : **Docker** + **Docker Compose**, et un **reverse proxy** (Nginx/Caddy/Cloudflare) pour les domaines en HTTPS.

---

## Côté éditeur (toi) — préparer la livraison

Sur ta machine de build (avec le code source) :

```bash
# 1. Construire les images + le .tar
bash scripts/package-release.sh

# 2. Générer la licence du client (sur ton Mac, avec ta clé privée)
LICENSE_PRIVATE_KEY=$(grep '^LICENSE_PRIVATE_KEY=' ~/rbot-license-secret.txt | cut -d= -f2-) \
  node scripts/license-generate.mjs 1 nom-du-client

# 3. Préparer le .env.docker du client
cp .env.docker.example .env.docker
#    -> éditer : domaines, ENCRYPTION_SECRET unique, mots de passe MinIO, et LICENSE_KEY (étape 2)
```

Envoyer au client : **`rbot-release.tar` + `docker-compose.delivery.yml` + `.env.docker`**.

---

## Côté client — installer

```bash
# 1. Charger les images
docker load -i rbot-release.tar

# 2. Démarrer (renommer le compose en docker-compose.yml ou utiliser -f)
docker compose -f docker-compose.delivery.yml up -d
```

- La migration de base s'exécute automatiquement (service `typebot-migrate`).
- L'app vérifie la **licence** au démarrage : si absente/expirée → ne démarre pas.

Vérifier :
```bash
docker compose -f docker-compose.delivery.yml logs typebot-builder | grep -i licence
```

---

## Ports exposés
| Service | Port | À router (proxy) |
|---|---|---|
| builder | 8200 | `https://bot.client.com` |
| viewer  | 8201 | `https://botview.client.com` |
| MinIO API / console | 9010 / 9011 | (interne / admin) |

## Créer le premier admin (sur l'instance client)
```bash
docker compose -f docker-compose.delivery.yml run --rm -it -w /app \
  -e SKIP_ENV_CHECK=true \
  -e DATABASE_URL=postgresql://postgres:typebot@typebot-db-docker:5432/typebot?schema=public \
  typebot-migrate sh -c "echo 'utiliser le script create-admin depuis la machine de build'"
```
> Note : la création d'admin se fait avec le script `create-admin` (machine de build) pointé sur la base du client, ou via l'interface `/admin/users` une fois un premier admin créé.

## Renouveler une licence (sans rebuild)
1. Régénérer un `LICENSE_KEY` (étape 2 côté éditeur) avec la nouvelle durée.
2. Remplacer `LICENSE_KEY=` dans le `.env.docker` du client.
3. `docker compose -f docker-compose.delivery.yml up -d` (redémarre, reprend la nouvelle licence).
