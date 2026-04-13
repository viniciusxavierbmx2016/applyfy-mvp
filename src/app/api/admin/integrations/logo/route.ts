import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient, STORAGE_BUCKET } from "@/lib/supabase-admin";

const ALLOWED_GATEWAYS = new Set(["applyfy"]);
const SETTING_KEY: Record<string, string> = {
  applyfy: "applyfy_logo_url",
};

function slugifyGateway(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 40);
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Servidor mal configurado (service role key ausente)" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const gatewayRaw = (formData.get("gateway") as string | null) || "applyfy";
    const gateway = slugifyGateway(gatewayRaw);

    if (!file) {
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
    }
    if (!ALLOWED_GATEWAYS.has(gateway)) {
      return NextResponse.json({ error: "Gateway inválido" }, { status: 400 });
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

    const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
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
    const path = `integrations/${gateway}-${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });

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

    const settingKey = SETTING_KEY[gateway];
    await prisma.settings.upsert({
      where: { key: settingKey },
      create: { key: settingKey, value: url },
      update: { value: url },
    });

    return NextResponse.json({ url, gateway });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    console.error("POST /api/admin/integrations/logo error:", error);
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
