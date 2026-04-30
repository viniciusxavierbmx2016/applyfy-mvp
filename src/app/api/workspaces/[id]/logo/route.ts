import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { canAccessWorkspace } from "@/lib/workspace";
import { createAdminClient, STORAGE_BUCKET } from "@/lib/supabase-admin";

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    if (!(await canAccessWorkspace(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Servidor mal configurado (service role key ausente)" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Apenas imagens são permitidas" },
        { status: 400 }
      );
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Arquivo muito grande (máx. 2MB)" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: buckets, error: listErr } =
      await supabase.storage.listBuckets();
    if (listErr) {
      return NextResponse.json(
        { error: `Erro ao listar buckets: ${listErr.message}` },
        { status: 500 }
      );
    }
    const bucketExists = buckets?.some((b) => b.name === STORAGE_BUCKET);
    if (!bucketExists) {
      const { error: createErr } = await supabase.storage.createBucket(
        STORAGE_BUCKET,
        { public: true, fileSizeLimit: 5 * 1024 * 1024 }
      );
      if (createErr) {
        return NextResponse.json(
          { error: `Erro ao criar bucket: ${createErr.message}` },
          { status: 500 }
        );
      }
    }

    const ext = (file.name.split(".").pop() || "png").toLowerCase().slice(0, 5);
    const path = `workspaces/${params.id}-${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, arrayBuffer, { contentType: file.type, upsert: true });

    if (uploadError) {
      return NextResponse.json(
        { error: `Falha no upload: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: publicUrl } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);
    const url = publicUrl.publicUrl;

    const workspace = await prisma.workspace.update({
      where: { id: params.id },
      data: { logoUrl: url },
    });

    return NextResponse.json({ workspace, url });
  } catch (error) {
    console.error("POST /api/workspaces/[id]/logo error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
