import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createAdminClient,
  TICKET_ATTACHMENTS_BUCKET,
} from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";

const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "application/pdf",
]);
const MAX_SIZE = 10 * 1024 * 1024; // 10MB per file

// Single-file upload to the private ticket-attachments bucket. Returns the
// path; the caller includes it in `attachments[]` of POST /tickets or
// /tickets/[id]/messages. Per-message limit (5 files) is enforced at message
// creation, not here.
//
// Auth: any authenticated user. Path includes userId so admins know who
// uploaded; we additionally sanity-check ownership at signed-url time.
export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Tipo de arquivo não permitido (imagens e PDF apenas)" },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Arquivo excede 10 MB" },
      { status: 400 }
    );
  }

  const ext = (file.name.split(".").pop() || "bin")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `tickets/${user.id}/${ts}-${rand}.${ext}`;

  const supabase = createAdminClient();
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from(TICKET_ATTACHMENTS_BUCKET)
    .upload(path, buf, {
      contentType: file.type,
      upsert: false,
    });
  if (error) {
    console.error("[support upload] error:", error.message);
    return NextResponse.json(
      { error: "Falha no upload" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    path,
    contentType: file.type,
    name: file.name,
    size: file.size,
  });
}
