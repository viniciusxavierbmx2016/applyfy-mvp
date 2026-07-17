import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient, STORAGE_BUCKET } from "@/lib/supabase-admin";

// Emissora de signed upload URL pras IMAGENS (thumbnail/banner do curso, capa do
// módulo, banner da vitrine — via o helper upload-image.ts). Molde do BUG A
// (materials/signed-url): o browser sobe DIRETO pro Supabase Storage, sem passar
// pela função da Vercel → sem o teto de ~4.5MB. O corpo aqui é JSON minúsculo.
//
// Endurecida vs a lambda antiga: valida contentType (só imagem) e o tamanho
// DECLARADO antes de assinar; o enforcement do tamanho REAL é o fileSizeLimit
// do bucket (10MB). O naming preserva o formato da rota antiga (Date.now() no
// nome — troca de imagem NUNCA sobrescreve o objeto que está no ar; o novo só
// vale quando o save persiste a URL).
//
// A lambda /api/upload segue viva pros consumidores não-migrados (PDF de
// termos, email-logo, botão-suporte, thumb de live).
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // = MAX_IMAGE_MB do helper (10MB)

export async function POST(request: Request) {
  // Gate = PARIDADE com /api/upload (mesmos checks, mesmas mensagens).
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Não autenticado. Faça login novamente." },
      { status: 401 }
    );
  }
  if (user.role !== "ADMIN" && user.role !== "PRODUCER") {
    return NextResponse.json(
      { error: "Apenas staff (admin/producer) podem fazer upload." },
      { status: 403 }
    );
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("SUPABASE_SERVICE_ROLE_KEY not set");
    return NextResponse.json(
      { error: "Servidor mal configurado (service role key ausente)" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { fileName, fileSize, fileType, path } = body as {
      fileName?: string;
      fileSize?: number;
      fileType?: string;
      path?: string;
    };

    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json(
        { error: "Nome do arquivo obrigatório" },
        { status: 400 }
      );
    }
    if (typeof fileSize !== "number" || fileSize <= 0) {
      return NextResponse.json({ error: "Tamanho inválido" }, { status: 400 });
    }
    if (fileSize > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Arquivo muito grande (máx. 10MB)" },
        { status: 400 }
      );
    }
    if (typeof fileType !== "string" || !fileType.startsWith("image/")) {
      return NextResponse.json(
        { error: "Apenas imagens são permitidas" },
        { status: 400 }
      );
    }

    // Mesmo sanitize + naming da lambda antiga (URLs saem com o mesmo formato);
    // a extensão vem do fileName do cliente → reduzida a [a-z0-9] antes de
    // entrar no path (endurecimento; molde do support/attachments).
    const rawPath = typeof path === "string" ? path : "";
    const safePath = rawPath
      .replace(/^\/+/, "")
      .replace(/\.\./g, "")
      .replace(/[^\w\-/.]/g, "");
    const ext =
      (fileName.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "") ||
      "jpg";
    const storagePath = safePath
      ? `${safePath.replace(/\.[^/.]+$/, "")}-${Date.now()}.${ext}`
      : `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(storagePath);
    if (error || !data) {
      console.error("createSignedUploadUrl error:", error);
      return NextResponse.json(
        { error: "Erro ao gerar URL de upload" },
        { status: 500 }
      );
    }

    // getPublicUrl é construção de string pura — devolvida já na emissão, o
    // helper não precisa de um 3º request de confirmação (a "confirmação" das
    // imagens é o save que persiste a URL, intocado).
    const { data: publicUrl } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    return NextResponse.json({
      path: data.path,
      token: data.token,
      publicUrl: publicUrl.publicUrl,
    });
  } catch (error) {
    console.error("POST signed-url error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { error: `Erro inesperado: ${message}` },
      { status: 500 }
    );
  }
}
