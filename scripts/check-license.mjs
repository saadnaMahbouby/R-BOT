#!/usr/bin/env node
// Vérifie la licence au démarrage du conteneur. Sort en erreur (1) si la
// licence est absente / invalide / expirée → l'app ne démarre pas.
// La clé publique est GRAVÉE ici (dans l'image) : elle n'est pas surchargeable
// par une variable d'environnement, donc la vérification ne peut pas être
// désactivée en éditant .env.docker. Seul le détenteur de la clé privée
// (hors instance) peut générer/prolonger une licence valide.
import crypto from "node:crypto";

const publicKeyBase64 =
  "MCowBQYDK2VwAyEAgkhRQub8veZIf1bhYhiG5u0vFaHQxTcQhb0P46PRLQQ=";
const licenseKey = process.env.LICENSE_KEY;

if (!licenseKey) {
  console.error("❌ LICENSE_KEY manquante — l'application ne peut pas démarrer.");
  process.exit(1);
}

const [message, signatureB64] = licenseKey.split(".");
if (!message || !signatureB64) {
  console.error("❌ Licence malformée.");
  process.exit(1);
}

try {
  const publicKey = crypto.createPublicKey({
    key: Buffer.from(publicKeyBase64, "base64"),
    format: "der",
    type: "spki",
  });
  const isSignatureValid = crypto.verify(
    null,
    Buffer.from(message),
    publicKey,
    Buffer.from(signatureB64, "base64url"),
  );
  if (!isSignatureValid) {
    console.error("❌ Signature de licence invalide.");
    process.exit(1);
  }
  const payload = JSON.parse(Buffer.from(message, "base64url").toString());
  if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) {
    console.error(
      `❌ Licence expirée (le ${new Date((payload.exp ?? 0) * 1000).toISOString().slice(0, 10)}).`,
    );
    process.exit(1);
  }
  console.log(
    `✅ Licence valide jusqu'au ${new Date(payload.exp * 1000).toISOString().slice(0, 10)}.`,
  );
  process.exit(0);
} catch (error) {
  console.error("❌ Erreur de vérification de licence:", error.message);
  process.exit(1);
}
