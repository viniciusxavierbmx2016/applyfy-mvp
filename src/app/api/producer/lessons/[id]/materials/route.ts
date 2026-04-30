import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditLesson, requireStaff } from "@/lib/auth";
import { createAdminClient, MATERIALS_BUCKET } from "@/lib/supabase-admin";

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "audio/mpeg",
  "video/mp4",
  "text/plain",
  "text/csv",
]);

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_");
}

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

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    if (!(await canEditLesson(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string)?.trim();

    if (!file) {
      return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Arquivo excede 50MB" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: `Tipo de arquivo não permitido: ${file.type}` }, { status: 400 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
      select: { module: { select: { course: { select: { workspaceId: true } } } } },
    });
    if (!lesson) {
      return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
    }

    const workspaceId = lesson.module.course.workspaceId;
    const safeName = sanitizeFileName(file.name);
    const storagePath = `workspaces/${workspaceId}/lessons/${params.id}/${Date.now()}_${safeName}`;

    const supabase = createAdminClient();

    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === MATERIALS_BUCKET)) {
      await supabase.storage.createBucket(MATERIALS_BUCKET, { public: true });
    }

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(MATERIALS_BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Erro no upload" }, { status: 500 });
    }

    const { data: publicUrl } = supabase.storage
      .from(MATERIALS_BUCKET)
      .getPublicUrl(storagePath);

    const maxOrder = await prisma.lessonMaterial.aggregate({
      where: { lessonId: params.id },
      _max: { sortOrder: true },
    });

    const material = await prisma.lessonMaterial.create({
      data: {
        lessonId: params.id,
        name,
        fileName: file.name,
        fileUrl: publicUrl.publicUrl,
        fileSize: file.size,
        fileType: file.type,
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
