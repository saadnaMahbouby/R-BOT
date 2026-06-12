# R-BOT

Plateforme de chatbots interne, basée sur Typebot, avec authentification personnalisée
(email + mot de passe + Google Authenticator).

## Stack

Bun · TypeScript · Next.js · Prisma · PostgreSQL · Redis · Docker

## Déploiement

```bash
docker compose -f docker-compose.build.yml up -d --build
```

Les migrations de base de données s'appliquent automatiquement au démarrage
(service `typebot-migrate`).

## Créer un administrateur

```bash
docker compose -f docker-compose.build.yml run --rm -it -w /app \
  -e SKIP_ENV_CHECK=true \
  -e DATABASE_URL=postgresql://postgres:typebot@typebot-db-docker:5432/typebot?schema=public \
  typebot-migrate bun packages/scripts/src/createAdmin.ts
```

## Authentification

- Connexion par **email + mot de passe + code Google Authenticator** (TOTP, obligatoire).
- Au premier login, l'utilisateur scanne un QR code pour configurer son authenticator.
- Gestion des utilisateurs : `/admin/users` (réservé aux administrateurs).

## Développement

```bash
bun install
bun dev
```
