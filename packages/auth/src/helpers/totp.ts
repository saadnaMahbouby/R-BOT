import { env } from "@typebot.io/env";
import { authenticator } from "otplib";
import QRCode from "qrcode";

const issuer = "Typebot";
const encryptionAlgorithm = "AES-GCM";

authenticator.options = { window: 1 };

export const generateTotpSecret = (): string => authenticator.generateSecret();

export const getOtpauthUrl = (email: string, secret: string): string =>
  authenticator.keyuri(email, issuer, secret);

export const verifyTotpCode = (code: string, secret: string): boolean => {
  try {
    return authenticator.verify({ token: code.trim(), secret });
  } catch {
    return false;
  }
};

export const generateQrCodeDataUrl = (otpauthUrl: string): Promise<string> =>
  QRCode.toDataURL(otpauthUrl);

export const encryptTotpSecret = async (secret: string): Promise<string> => {
  const key = await importKey(["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: encryptionAlgorithm, iv },
    key,
    new TextEncoder().encode(secret),
  );
  return `${toHex(iv)}:${toBase64(new Uint8Array(encryptedBuffer))}`;
};

export const decryptTotpSecret = async (stored: string): Promise<string> => {
  const [ivHex, encryptedData] = stored.split(":");
  if (!ivHex || !encryptedData)
    throw new Error("Invalid encrypted TOTP secret format");
  const key = await importKey(["decrypt"]);
  const iv = fromHex(ivHex);
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: encryptionAlgorithm, iv },
    key,
    fromBase64(encryptedData),
  );
  return new TextDecoder().decode(decryptedBuffer);
};

const importKey = (usages: KeyUsage[]) => {
  if (!env.ENCRYPTION_SECRET)
    throw new Error("ENCRYPTION_SECRET is not in environment");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.ENCRYPTION_SECRET),
    encryptionAlgorithm,
    false,
    usages,
  );
};

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const fromHex = (hex: string) =>
  new Uint8Array(
    hex.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? [],
  );

const toBase64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode.apply(null, Array.from(bytes)));

const fromBase64 = (data: string) =>
  new Uint8Array(Array.from(atob(data)).map((char) => char.charCodeAt(0)));
