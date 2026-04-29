// One-shot migration: encrypt all existing User.document values in place.
// Idempotent — values already encrypted are skipped.
//
// Run with:  node scripts/encrypt-documents.mjs
// Required env: DATABASE_URL, ENCRYPTION_SECRET
//
// Safe to re-run; isEncrypted() check prevents double-encryption.

import { PrismaClient } from "@prisma/client";
import {
  createCipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

function getKey() {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) throw new Error("ENCRYPTION_SECRET not set");
  return scryptSync(secret, "members-club-salt", KEY_LENGTH);
}

function encrypt(text) {
  if (!text) return "";
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

function isEncrypted(value) {
  if (!value || !value.includes(":")) return false;
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  return parts[0].length === 32 && parts[1].length === 32;
}

const prisma = new PrismaClient();

async function main() {
  // Smoke-test the secret before touching any rows.
  encrypt("smoke-test");

  const users = await prisma.user.findMany({
    where: { document: { not: null } },
    select: { id: true, document: true },
  });

  let encrypted = 0;
  let skipped = 0;

  for (const user of users) {
    if (!user.document || isEncrypted(user.document)) {
      skipped++;
      continue;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { document: encrypt(user.document) },
    });
    encrypted++;
  }

  console.log(
    `Done: ${encrypted} encrypted, ${skipped} skipped (total ${users.length})`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
