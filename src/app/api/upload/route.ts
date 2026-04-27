import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient, STORAGE_BUCKET } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  // 1. Auth checks with distinct status codes (so we can tell which gate failed)
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Não autenticado. Faça login novamente." },
      { status: 401 }
    );
  }
  if (user.role !== "ADMIN" && user.role !== "PRODUCER") {
    return NextResponse.json(
      {
        error:
          "Apenas staff (admin/producer) podem fazer upload.",
      },
      { status: 403 }
    );
  }

  // 2. Validate required env vars early
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("SUPABASE_SERVICE_ROLE_KEY not set");
    return NextResponse.json(
      { error: "Servidor mal configurado (service role key ausente)" },
      { status: 500 }
    );
  }

  try {
    // 3. Parse and validate the file
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const rawPath = (formData.get("path") as string | null) || "";
    const safePath = rawPath
      .replace(/^\/+/, "")
      .replace(/\.\./g, "")
      .replace(/[^\w\-/.]/g, "");

    if (!file) {
      return NextResponse.json(
        { error: "Arquivo não enviado" },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/", "application/pdf"];
    const isAllowed = allowedTypes.some((t) =>
      t.endsWith("/") ? file.type.startsWith(t) : file.type === t
    );
    if (!isAllowed) {
      return NextResponse.json(
        { error: "Apenas imagens e PDFs são permitidos" },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Arquivo muito grande (máx. 5MB)" },
        { status: 400 }
      );
    }

    // 4. Use service-role client (bypasses RLS / storage policies)
    const supabase = createAdminClient();

    // Ensure bucket exists (create as public if not)
    const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
    if (listErr) {
      console.error("listBuckets error:", listErr);
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
        console.error("createBucket error:", createErr);
        return NextResponse.json(
          { error: `Erro ao criar bucket: ${createErr.message}` },
          { status: 500 }
        );
      }
    }

    // 5. Upload
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = safePath
      ? `${safePath.replace(/\.[^/.]+$/, "")}-${Date.now()}.${ext}`
      : `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
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
    console.error("Unexpected upload error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { error: `Erro inesperado: ${message}` },
      { status: 500 }
    );
  }
}
