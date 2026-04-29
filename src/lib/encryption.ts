import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) throw new Error("ENCRYPTION_SECRET not set");
  return scryptSync(secret, "members-club-salt", KEY_LENGTH);
}

export function encrypt(text: string): string {
  if (!text) return "";
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();

  // Format: iv:tag:encrypted
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(":")) return encryptedText;
  if (encryptedText.split(":").length !== 3) return encryptedText;

  try {
    const [ivHex, tagHex, encrypted] = encryptedText.split(":");
    const key = getKey();
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    // Pre-encryption legacy values, or wrong key — return as-is so reads
    // never throw. encrypt() is the strict path; decrypt() is forgiving.
    return encryptedText;
  }
}

export function isEncrypted(value: string): boolean {
  if (!value || !value.includes(":")) return false;
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  // iv (16 bytes = 32 hex), tag (16 bytes = 32 hex)
  return parts[0].length === 32 && parts[1].length === 32;
}
