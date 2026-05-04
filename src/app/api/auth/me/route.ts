import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdminClient, AVATAR_BUCKET } from "@/lib/supabase-admin";
import { getAdminPermissions } from "@/lib/admin-permissions-server";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export async function GET(req: NextRequest) {
  const t0 = Date.now();
  try {
    const user = await getCurrentUser();
    const t1 = Date.now();
    if (!user) {
      console.log(`[API /api/auth/me] auth:${t1 - t0}ms total:${t1 - t0}ms (unauth)`);
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const ua = req.headers.get("user-agent") || "";
    const referer = req.headers.get("referer") || "";

    prisma.user
      .update({
        where: { id: user.id },
        data: { lastIpAddress: ip, lastAccessAt: new Date() },
      })
      .catch(() => {});

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    prisma.accessLog
      .findFirst({ where: { userId: user.id, createdAt: { gte: oneHourAgo } } })
      .then((recent) => {
        if (!recent) {
          prisma.accessLog
            .create({ data: { userId: user.id, ip, userAgent: ua, path: referer } })
            .catch(() => {});
        }
      })
      .catch(() => {});
    let collaborator: {
      permissions: string[];
      courseIds: string[];
      workspaceId: string;
    } | null = null;
    // Resolve Collaborator independently of User.role (Stage C2). A STUDENT
    // who has an ACCEPTED Collaborator row should still get the producer-side
    // sidebar/permissions populated. Pre-C5 this branch only fired for
    // role === "COLLABORATOR".
    const [collabRow, workspace] = await Promise.all([
      prisma.collaborator.findFirst({
        where: { userId: user.id, status: "ACCEPTED" },
        select: { permissions: true, courseIds: true, workspaceId: true },
      }),
      user.workspaceId
        ? prisma.workspace.findUnique({
            where: { id: user.workspaceId },
            select: { slug: true, name: true, logoUrl: true },
          })
        : Promise.resolve(null),
    ]);
    if (collabRow) collaborator = collabRow;
    const adminPermissions =
      user.role === "ADMIN" || user.role === "ADMIN_COLLABORATOR"
        ? Array.from(await getAdminPermissions(user.id, user.role))
        : [];
    const t2 = Date.now();
    console.log(
      `[API /api/auth/me] auth:${t1 - t0}ms query:${t2 - t1}ms total:${t2 - t0}ms`
    );
    return NextResponse.json({ user, collaborator, workspace, adminPermissions });
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Arquivo não enviado" },
        { status: 400 }
      );
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: "Formato inválido. Use JPG, PNG ou WebP." },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Arquivo muito grande (máx. 2MB)" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
    if (listErr) {
      console.error("listBuckets error:", listErr);
      return NextResponse.json(
        { error: `Erro ao listar buckets: ${listErr.message}` },
        { status: 500 }
      );
    }
    const exists = buckets?.some((b) => b.name === AVATAR_BUCKET);
    if (!exists) {
      const { error: createErr } = await supabase.storage.createBucket(
        AVATAR_BUCKET,
        { public: true, fileSizeLimit: MAX_BYTES }
      );
      if (createErr) {
        console.error("createBucket error:", createErr);
        return NextResponse.json(
          { error: `Erro ao criar bucket: ${createErr.message}` },
          { status: 500 }
        );
      }
    }

    const ext = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const fileName = `${user.id}/${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(fileName, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Avatar upload error:", uploadError);
      return NextResponse.json(
        { error: `Falha no upload: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: publicUrl } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(fileName);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: publicUrl.publicUrl },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("PATCH /api/auth/me error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { error: `Erro inesperado: ${message}` },
      { status: 500 }
    );
  }
}
