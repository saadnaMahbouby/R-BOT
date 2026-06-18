#!/usr/bin/env node
// Vérifie la licence au démarrage du conteneur. Sort en erreur (1) si la
// licence est configurée mais invalide/expirée, ce qui empêche l'app de tourner.
// Si aucune clé publique n'est configurée, on autorise le démarrage (licence non activée).
import crypto from "node:crypto";

const publicKeyBase64 = process.env.LICENSE_PUBLIC_KEY;
const licenseKey = process.env.LICENSE_KEY;

if (!publicKeyBase64) {
  console.warn(
    "⚠️  Licence non activée (LICENSE_PUBLIC_KEY absent) — démarrage autorisé.",
  );
  process.exit(0);
}

if (!licenseKey) {
  console.error("❌ LICENSE_KEY manquante alors que la licence est activée.");
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
