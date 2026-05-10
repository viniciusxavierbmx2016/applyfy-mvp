// One-shot backfill: encrypt and persist CPF/CNPJ for existing students
// whose User.document is still null. Idempotent — re-running skips users
// that already have a document on file.
//
// Usage:
//   node --env-file=.env.local scripts/backfill-cpf.mjs <data.json>
//
// data.json format (an array of {email, cpf}):
//   [
//     { "email": "user@example.com", "cpf": "000.000.000-00" },
//     ...
//   ]
//
// Keep the data file outside the repo or use a .local.json suffix so the
// CPFs are never committed.

import { PrismaClient } from "@prisma/client";
import { createCipheriv, randomBytes, scryptSync } from "crypto";
import { readFileSync } from "fs";

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

const dataPath = process.argv[2];
if (!dataPath) {
  console.error("Usage: node --env-file=.env.local scripts/backfill-cpf.mjs <data.json>");
  process.exit(1);
}

const updates = JSON.parse(readFileSync(dataPath, "utf8"));
if (!Array.isArray(updates)) {
  console.error("Expected a JSON array of { email, cpf } objects.");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  for (const { email, cpf } of updates) {
    if (!email || !cpf) {
      console.log(`skip (missing email or cpf): ${JSON.stringify({ email, cpf })}`);
      continue;
    }
    const result = await prisma.user.updateMany({
      where: { email, document: null },
      data: { document: encrypt(cpf) },
    });
    const tag = result.count > 0 ? "OK saved" : "skip (already set or not found)";
    console.log(`${email}: ${tag}`);
  }
  console.log("\nDone.");
} finally {
  await prisma.$disconnect();
}
