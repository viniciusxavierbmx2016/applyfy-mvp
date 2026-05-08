import crypto from "crypto";

// Workspace-scoped student credentials.
//
// Hash stack: scrypt (Node built-in) with a per-row 32-byte random salt.
// scryptSync produces 64-byte derived keys; we hex-encode for storage.
// Verification uses timingSafeEqual to avoid leaking timing side channels.

const SCRYPT_KEY_LENGTH = 64;
const SALT_BYTES = 32;
const RESET_TOKEN_BYTES = 32;
const TEMP_PASSWORD_BYTES = 3;

export function generateSalt(): string {
  return crypto.randomBytes(SALT_BYTES).toString("hex");
}

export function hashPassword(password: string, salt: string): string {
  return crypto
    .scryptSync(password, salt, SCRYPT_KEY_LENGTH)
    .toString("hex");
}

export function verifyPassword(
  password: string,
  hash: string,
  salt: string
): boolean {
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH);
  const stored = Buffer.from(hash, "hex");
  if (stored.length !== derived.length) return false;
  return crypto.timingSafeEqual(derived, stored);
}

// Friendly password (e.g. mc-a7b3c2) shown in the access email so the
// student can log in without going through "forgot password" first.
export function generateTempPassword(): string {
  return `mc-${crypto.randomBytes(TEMP_PASSWORD_BYTES).toString("hex")}`;
}

// Reset token sent in the recovery email URL. We store the SHA-256 hash
// of this token in the database; the raw value never persists.
export function generateResetToken(): string {
  return crypto.randomBytes(RESET_TOKEN_BYTES).toString("hex");
}

export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
