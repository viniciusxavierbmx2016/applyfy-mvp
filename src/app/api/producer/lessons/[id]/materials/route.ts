import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditLesson, requireStaff } from "@/lib/auth";
import { createAdminClient, MATERIALS_BUCKET } from "@/lib/supabase-admin";
import { MATERIALS_ALLOWED_TYPES, MATERIALS_MAX_SIZE } from "@/lib/materials-constants";

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    if (!(await canEditLesson(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const materials = await prisma.lessonMaterial.findMany({
      where: { lessonId: params.id },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ materials });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

// Grava o metadado do material APÓS o browser subir o arquivo direto pro
// Storage (via a signed URL de ./signed-url). Recebe JSON minúsculo (o arquivo
// NÃO transita mais por aqui), reconfere o gate + o prefixo do path, e resolve
// a fileUrl com getPublicUrl (mesmo formato de antes → o DELETE segue igual).
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    if (!(await canEditLesson(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { path, name, fileName, fileSize, fileType } = body as {
      path?: string;
      name?: string;
      fileName?: string;
      fileSize?: number;
      fileType?: string;
    };

    if (!path || !name || !fileName || typeof fileSize !== "number" || !fileType) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      select: { module: { select: { course: { select: { workspaceId: true } } } } },
    });
    if (!lesson) {
      return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
    }

    // Confere o prefixo do path — o cliente não pode gravar metadado apontando
    // pro storage de outro workspace/aula.
    const workspaceId = lesson.module.course.workspaceId;
    const expectedPrefix = `workspaces/${workspaceId}/lessons/${params.id}/`;
    if (!path.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "Caminho inválido" }, { status: 400 });
    }

    // Defense-in-depth: revalida tipo/tamanho (o metadado vem do cliente).
    if (fileSize > MATERIALS_MAX_SIZE) {
      return NextResponse.json({ error: "Arquivo excede 50MB" }, { status: 400 });
    }
    if (!MATERIALS_ALLOWED_TYPES.has(fileType)) {
      return NextResponse.json({ error: `Tipo de arquivo não permitido: ${fileType}` }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: publicUrl } = supabase.storage
      .from(MATERIALS_BUCKET)
      .getPublicUrl(path);

    const maxOrder = await prisma.lessonMaterial.aggregate({
      where: { lessonId: params.id },
      _max: { sortOrder: true },
    });

    const material = await prisma.lessonMaterial.create({
      data: {
        lessonId: params.id,
        name: name.trim(),
        fileName,
        fileUrl: publicUrl.publicUrl,
        fileSize,
        fileType,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json({ material }, { status: 201 });
  } catch (error) {
    console.error("POST material error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
