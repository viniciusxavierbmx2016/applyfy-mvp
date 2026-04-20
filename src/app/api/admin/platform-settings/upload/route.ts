import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient, STORAGE_BUCKET } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const field = formData.get("field") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Apenas imagens são permitidas" }, { status: 400 });
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Arquivo muito grande (máx. 2MB)" }, { status: 400 });
    }
    if (field !== "logo" && field !== "favicon") {
      return NextResponse.json({ error: "Campo inválido" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === STORAGE_BUCKET);
    if (!bucketExists) {
      await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
      });
    }

    const ext = file.name.split(".").pop() || "png";
    const fileName = `platform/${field}-${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Falha no upload: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: publicUrl } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl.publicUrl });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro no upload" }, { status });
  }
}
