import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditLesson, requireStaff } from "@/lib/auth";
import { createAdminClient, MATERIALS_BUCKET } from "@/lib/supabase-admin";
import {
  MATERIALS_ALLOWED_TYPES,
  MATERIALS_MAX_SIZE,
  sanitizeFileName,
} from "@/lib/materials-constants";

// Emite uma signed upload URL pro browser subir o arquivo DIRETO pro Supabase
// Storage (sem transitar pela função da Vercel → sem o teto de ~4.5MB). O
// servidor valida o gate + tipo + tamanho e MONTA o path (o cliente não escolhe
// onde grava). O corpo é JSON minúsculo, nunca bate no limite.
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    if (!(await canEditLesson(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { fileName, fileSize, fileType } = body as {
      fileName?: string;
      fileSize?: number;
      fileType?: string;
    };

    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json({ error: "Nome do arquivo obrigatório" }, { status: 400 });
    }
    if (typeof fileSize !== "number" || fileSize <= 0) {
      return NextResponse.json({ error: "Tamanho inválido" }, { status: 400 });
    }
    if (fileSize > MATERIALS_MAX_SIZE) {
      return NextResponse.json({ error: "Arquivo excede 50MB" }, { status: 400 });
    }
    if (!fileType || !MATERIALS_ALLOWED_TYPES.has(fileType)) {
      return NextResponse.json({ error: `Tipo de arquivo não permitido: ${fileType}` }, { status: 400 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      select: { module: { select: { course: { select: { workspaceId: true } } } } },
    });
    if (!lesson) {
      return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
    }

    // O path é montado no SERVIDOR (o cliente só manda o fileName).
    const workspaceId = lesson.module.course.workspaceId;
    const safeName = sanitizeFileName(fileName);
    const storagePath = `workspaces/${workspaceId}/lessons/${params.id}/${Date.now()}_${safeName}`;

    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from(MATERIALS_BUCKET)
      .createSignedUploadUrl(storagePath);
    if (error || !data) {
      console.error("createSignedUploadUrl error:", error);
      return NextResponse.json({ error: "Erro ao gerar URL de upload" }, { status: 500 });
    }

    return NextResponse.json({ path: data.path, token: data.token });
  } catch (error) {
    console.error("POST signed-url error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
