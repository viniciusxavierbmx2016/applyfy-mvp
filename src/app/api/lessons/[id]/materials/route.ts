import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkLessonAccess } from "@/lib/lesson-access";

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Mesmo julgamento de antes, agora num lugar só — a rota de download precisa
    // do idêntico. Ramos, ordem e códigos preservados (404 aula, 403 acesso).
    const access = await checkLessonAccess(user, params.id);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.status === 404 ? "Aula não encontrada" : "Sem acesso" },
        { status: access.status }
      );
    }

    // ⚠️ `fileUrl` NÃO sai daqui. A URL pública do arquivo deixou de ser
    // devolvida ao cliente: o download passa pela rota assinada, que refaz o
    // gate a cada clique. Nenhum consumidor usava o campo — o painel do
    // produtor (`lesson-materials.tsx`) o declara e nunca renderiza.
    const materials = await prisma.lessonMaterial.findMany({
      where: { lessonId: params.id },
      select: {
        id: true,
        name: true,
        fileName: true,
        fileSize: true,
        fileType: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ materials });
  } catch (error) {
    console.error("GET lesson materials error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
