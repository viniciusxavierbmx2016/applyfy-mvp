import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkLessonAccess } from "@/lib/lesson-access";
import { materialPathFromUrl } from "@/lib/materials-constants";
import { createAdminClient, MATERIALS_BUCKET } from "@/lib/supabase-admin";

// Janela da assinatura. A assinatura é cunhada NO CLIQUE e consumida no
// redirect seguinte, então não precisa durar a sessão — precisa durar o
// download. Piso: o teto do app é 50 MB, que a ~500 kbps leva ~14 min, e uma
// retomada (Range após queda de conexão) exige assinatura ainda válida. Teto:
// 15 min de janela para um link que vaze. O molde de anexo de ticket usa 1h
// porque lá a URL é entregue à tela e fica parada esperando o clique; aqui não.
const SIGNED_URL_TTL_SECONDS = 900;

// GET /api/lessons/[id]/materials/[materialId]/download
// Gate → confere que o material é DESTA aula → assina → 302.
//
// O que fica no DOM do aluno é ESTA rota, não a assinatura: um link copiado da
// tela leva o próximo visitante ao mesmo gate. Nenhuma URL de arquivo é
// devolvida ao cliente em lugar nenhum.
export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string; materialId: string }> }
) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const access = await checkLessonAccess(user, params.id);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.status === 404 ? "Aula não encontrada" : "Sem acesso" },
        { status: access.status }
      );
    }

    // O material tem de ser DESTA aula. É o "orphan paths are not signable" do
    // molde de tickets aplicado aqui: id de material de outra aula não assina, e
    // devolve 404 — não 403 — para não confirmar que aquele id existe.
    const material = await prisma.lessonMaterial.findFirst({
      where: { id: params.materialId, lessonId: params.id },
      select: { fileUrl: true, fileName: true },
    });
    if (!material) {
      return NextResponse.json(
        { error: "Material não encontrado" },
        { status: 404 }
      );
    }

    const path = materialPathFromUrl(material.fileUrl);
    if (!path) {
      console.error(
        "[material download] fileUrl fora do formato esperado:",
        params.materialId
      );
      return NextResponse.json({ error: "Material indisponível" }, { status: 404 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from(MATERIALS_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, {
        download: material.fileName,
      });

    if (error || !data?.signedUrl) {
      console.error("[material download] assinatura falhou:", error?.message);
      return NextResponse.json({ error: "Falha ao gerar link" }, { status: 500 });
    }

    return NextResponse.redirect(data.signedUrl, 302);
  } catch (error) {
    console.error("[MATERIAL_DOWNLOAD]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
