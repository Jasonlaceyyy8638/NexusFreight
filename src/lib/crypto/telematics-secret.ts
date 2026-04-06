import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

function keyFromEnv(): Buffer | null {
  const raw = process.env.TELEMATICS_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  return scryptSync(raw, "nexus-telematics-salt", 32);
}

export function telematicsEncryptionConfigured(): boolean {
  return keyFromEnv() != null;
}

export type EncryptedPayload = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

export function encryptTelematicsSecret(plain: string): EncryptedPayload | null {
  const key = keyFromEnv();
  if (!key) return null;
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: enc.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptTelematicsSecret(payload: EncryptedPayload): string | null {
  const key = keyFromEnv();
  if (!key) return null;
  try {
    const decipher = createDecipheriv(
      ALGO,
      key,
      Buffer.from(payload.iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
    const out = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, "base64")),
      decipher.final(),
    ]);
    return out.toString("utf8");
  } catch {
    return null;
  }
}
