#!/usr/bin/env node
// Génère une licence signée valable N années.
// Usage: LICENSE_PRIVATE_KEY=<clé privée base64> node scripts/license-generate.mjs [années] [propriétaire]
// Ex:    LICENSE_PRIVATE_KEY=... node scripts/license-generate.mjs 5 richatt
import crypto from "node:crypto";

const privBase64 = process.env.LICENSE_PRIVATE_KEY;
if (!privBase64) {
  console.error(
    "❌ LICENSE_PRIVATE_KEY manquante. Génère d'abord les clés avec scripts/license-keys.mjs",
  );
  process.exit(1);
}

const years = Number(process.argv[2] ?? 5);
const owner = process.argv[3] ?? "richatt";
if (!Number.isFinite(years) || years <= 0) {
  console.error("❌ Nombre d'années invalide.");
  process.exit(1);
}

const privateKey = crypto.createPrivateKey({
  key: Buffer.from(privBase64, "base64"),
  format: "der",
  type: "pkcs8",
});

const exp = Math.floor(Date.now() / 1000) + Math.round(years * 365 * 24 * 3600);
const payload = { exp, iss: "R-BOT", owner };
const message = Buffer.from(JSON.stringify(payload)).toString("base64url");
const signature = crypto
  .sign(null, Buffer.from(message), privateKey)
  .toString("base64url");

console.log("\n=== Licence (à mettre dans .env.docker) ===");
console.log(`LICENSE_KEY=${message}.${signature}`);
console.log(
  `\n✅ Valable ${years} an(s), jusqu'au ${new Date(exp * 1000).toISOString().slice(0, 10)} (propriétaire: ${owner}).\n`,
);
