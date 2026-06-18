#!/usr/bin/env node
// Génère une paire de clés Ed25519 pour le système de licence.
// La clé PUBLIQUE va dans .env.docker (LICENSE_PUBLIC_KEY).
// La clé PRIVÉE est ton SECRET ADMIN : garde-la hors du repo et hors du serveur.
import crypto from "node:crypto";

const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
const pub = publicKey.export({ type: "spki", format: "der" }).toString("base64");
const priv = privateKey
  .export({ type: "pkcs8", format: "der" })
  .toString("base64");

console.log("\n=== Clé PUBLIQUE (à mettre dans .env.docker) ===");
console.log(`LICENSE_PUBLIC_KEY=${pub}`);
console.log("\n=== Clé PRIVÉE (SECRET ADMIN — garde-la précieusement, hors repo) ===");
console.log(`LICENSE_PRIVATE_KEY=${priv}`);
console.log(
  "\n⚠️  Ne mets JAMAIS la clé privée dans le repo ni sur le serveur de prod.\n",
);
