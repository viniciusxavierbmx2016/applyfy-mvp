import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, canEditCourse, getCurrentUser } from "@/lib/auth";
import { collaboratorCanActOnCourse } from "@/lib/collaborator";
import { updateCourseSchema, validateBody } from "@/lib/validations";

/* 9.112 — passou a devolver `isOwner` além de `ok`.

   QUEM PODE EDITAR não mudou em nada: os mesmos três caminhos de antes, na
   mesma ordem. O que a função passou a dizer é POR QUAL deles a pessoa entrou,
   porque o bloco comercial (preço, checkout, moeda) é do dono — e o PUT precisa
   saber disso para não gravá-lo vindo de um colaborador.

   ⚠️ `isOwner` aqui é "ADMIN ou dono DO CURSO", que é a régua que esta função
   já usava. Ela é mais estreita que a do `assertCanViewCourse`, que também
   aceita o dono do WORKSPACE — assimetria PRÉ-EXISTENTE, deixada de pé de
   propósito: mexer nela mudaria quem pode editar, que não é o escopo daqui.
   Na prática o dono de workspace que não é dono do curso já leva 403 abaixo. */
async function assertCanEditCourse(courseId: string) {
  const staff = await requireStaff();
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, ownerId: true },
  });
  if (!course) return { error: "Curso não encontrado", status: 404 as const };
  if (staff.role === "ADMIN") return { ok: true as const, isOwner: true };
  if (staff.role === "PRODUCER" && course.ownerId !== staff.id) {
    return { error: "Forbidden", status: 403 as const };
  }
  if (staff.role === "COLLABORATOR") {
    const ok = await canEditCourse(staff, courseId);
    if (!ok) return { error: "Forbidden", status: 403 as const };
    return { ok: true as const, isOwner: false };
  }
  // Sobra o PRODUCER que passou pela checagem acima, isto é: o dono do curso.
  return { ok: true as const, isOwner: true };
}

// Read-gate for the course editor endpoint. Broader than assertCanEditCourse:
// any staff who legitimately opens a course sub-screen may READ it (content,
// students, comments, lives), while PUT/DELETE stay owner/MANAGE_LESSONS-gated.
// Mirrors the by-slug molde (getCurrentUser → 401) but authorizes by staff
// role, not by student enrollment. Its own findUnique (ownerId + workspace
// ownerId) is internal to the check and never returned to the client.
async function assertCanViewCourse(courseId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Não autorizado", status: 401 as const };
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      ownerId: true,
      workspace: { select: { ownerId: true } },
    },
  });
  if (!course) return { error: "Curso não encontrado", status: 404 as const };
  // Short-circuit ADMIN/dono ANTES do vínculo (lição 9.63: há PRODUCER em
  // produção que TAMBÉM carrega linha de Collaborator).
  //
  // 9.112 — estes DOIS ramos, e só eles, são o dono. `isOwner` sai daqui de
  // graça: a consulta acima já trouxe `ownerId` e `workspace.ownerId`. Não há
  // pergunta nova nem terceiro jeito de perguntar "é dono?".
  if (user.role === "ADMIN") {
    return { ok: true as const, canManageLessons: true, isOwner: true };
  }
  if (
    user.role === "PRODUCER" &&
    (course.ownerId === user.id || course.workspace.ownerId === user.id)
  ) {
    return { ok: true as const, canManageLessons: true, isOwner: true };
  }
  // COLLABORATOR-by-role OR STUDENT with an accepted Collaborator row:
  // collaboratorCanActOnCourse matches by userId and already embeds the
  // cross-tenant workspace guard + course-scope.
  //
  // ─── 9.81: por que DUAS listas e não uma ───
  // Quem ENTRA continua sendo o mesmo conjunto de antes — a união das duas
  // listas é exatamente o anyOf de 5 que existia aqui. O que muda é que agora
  // a rota sabe QUAL das duas portas a pessoa usou, porque o conteúdo da aula
  // (vídeo, descrição) é de quem edita conteúdo, não de quem responde
  // comentário ou administra matrícula.
  //
  // ⚠️ A estreita vem primeiro de propósito: no caso comum — o editor de
  // conteúdo abrindo o próprio editor — resolve em UMA consulta, não duas.
  const canManageLessons = await collaboratorCanActOnCourse(user.id, courseId, [
    "MANAGE_LESSONS",
  ]);
  if (canManageLessons) {
    return { ok: true as const, canManageLessons: true, isOwner: false };
  }
  // As outras 4: entram na rota (o layout do editor busca este endpoint em
  // TODA sub-tela — comentários, alunos, lives, comunidade), sem o conteúdo.
  const canView = await collaboratorCanActOnCourse(user.id, courseId, [
    "MANAGE_STUDENTS",
    "REPLY_COMMENTS",
    "MANAGE_COMMUNITY",
    "MANAGE_LIVES",
  ]);
  if (canView) return { ok: true as const, canManageLessons: false, isOwner: false };
  return { error: "Sem permissão", status: 403 as const };
}

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const check = await assertCanViewCourse(params.id);
    if ("error" in check) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    /* 9.81 — o payload é DECLARADO, campo a campo.

       Antes era `include` puro: devolvia toda coluna de Course, Module, Lesson
       e Section a qualquer uma das 5 permissões que abrem o editor. O `select`
       explícito faz duas coisas: recorta o conteúdo de aula (abaixo) e impede
       que uma coluna NOVA passe a vazar sozinha só por nascer no schema.

       ⚠️ Em Course, Module e Section o select lista TODAS as colunas atuais —
       o payload dessas três é byte-a-byte o de antes. O recorte é só em Lesson.
       Motivo: os 8 consumidores desta rota foram mapeados um a um, e nenhum
       campo de curso/módulo/seção sobra sem dono. Campo a menos aqui é tela
       quebrada; a economia não valeria o risco. */
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        thumbnail: true,
        thumbnailPosition: true,
        bannerUrl: true,
        bannerPosition: true,
        bannerExtra: true,
        /* ⭐ 9.112 — BLOCO COMERCIAL: só o dono (e o ADMIN).

           `externalProductId` é a chave que casa este curso com o produto no
           gateway — infraestrutura de pagamento, não informação de trabalho. E
           preço e checkout são a mesma família: as 24 rotas
           `requireWorkspaceOwner` já reservam integrações e credenciais ao dono.
           Nenhuma permissão de colaborador os libera, e nenhuma permissão nova
           foi criada para isso.

           ⚠️ Este recorte NÃO ANDA SOZINHO. O `CourseForm` devolve o payload
           INTEIRO no PUT, e o PUT grava o que chega: cortar só a leitura faria
           o formulário do colaborador mandar `checkoutUrl: null` e `price: null`
           no primeiro "Salvar" — apagando preço e checkout do curso. A guarda
           gêmea está no PUT, no mesmo commit. Ver o comentário lá. */
        ...(check.isOwner && {
          checkoutUrl: true,
          price: true,
          priceCurrency: true,
          externalProductId: true,
        }),
        isPublished: true,
        showInStore: true,
        certificateEnabled: true,
        communityEnabled: true,
        lessonCommentsEnabled: true,
        reviewsEnabled: true,
        lessonReactionsEnabled: true,
        gamificationEnabled: true,
        lessonCommentsModerationEnabled: true,
        communityModerationEnabled: true,
        termsContent: true,
        termsFileUrl: true,
        termsUpdatedAt: true,
        showStudentCount: true,
        supportEmail: true,
        supportWhatsapp: true,
        showLessonSupport: true,
        showCourseInfoBox: true,
        showAccessBadge: true,
        supportButtonColor: true,
        supportButtonImage: true,
        memberBgColor: true,
        memberSidebarColor: true,
        memberHeaderColor: true,
        memberCardColor: true,
        memberPrimaryColor: true,
        memberTextColor: true,
        memberWelcomeText: true,
        memberLayoutStyle: true,
        courseBannerFadeEnabled: true,
        courseBannerFadeColor: true,
        courseBannerFadeOpacity: true,
        featured: true,
        category: true,
        order: true,
        ownerId: true,
        workspaceId: true,
        createdAt: true,
        updatedAt: true,
        sections: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            order: true,
            courseId: true,
            createdAt: true,
          },
        },
        modules: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            order: true,
            daysToRelease: true,
            releaseAt: true,
            thumbnailUrl: true,
            hideTitle: true,
            sectionId: true,
            courseId: true,
            lessons: {
              orderBy: { order: "asc" },
              select: {
                // Estrutura — quem abre a tela de alunos precisa disto para
                // editar liberação por aula (edit-access-modal).
                id: true,
                title: true,
                order: true,
                daysToRelease: true,
                moduleId: true,
                // ⭐ CONTEÚDO — só para quem edita conteúdo. O único consumidor
                // que lê estes campos é o editor de aulas
                // (edit → ModulesManager → LessonsManager), e a própria tela já
                // devolve quem não tem MANAGE_LESSONS para /comments.
                ...(check.canManageLessons
                  ? {
                      videoUrl: true,
                      description: true,
                      duration: true,
                      hideYoutubeChrome: true,
                    }
                  : {}),
              },
            },
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Curso não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ course });
  } catch (error) {
    console.error("GET /api/courses/[id] error:", error);
    if (error instanceof Error) {
      if (error.message === "Não autorizado") {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }
      if (error.message === "Sem permissão" || error.message === "Forbidden") {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
      }
    }
    return NextResponse.json(
      { error: "Erro ao buscar curso" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const check = await assertCanEditCourse(params.id);
    if ("error" in check) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const rawBody = await request.json();
    const v = validateBody(updateCourseSchema, rawBody);
    if (!v.success) return v.error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = v.data as Record<string, any>;
    const {
      title,
      slug,
      description,
      thumbnail,
      thumbnailPosition,
      bannerUrl,
      bannerPosition,
      checkoutUrl,
      price,
      priceCurrency,
      isPublished,
      showInStore,
      certificateEnabled,
      communityEnabled,
      lessonCommentsEnabled,
      lessonReactionsEnabled,
      reviewsEnabled,
      gamificationEnabled,
      lessonCommentsModerationEnabled,
      communityModerationEnabled,
      showStudentCount,
      supportEmail,
      supportWhatsapp,
      showLessonSupport,
      showCourseInfoBox,
      showAccessBadge,
      courseBannerFadeEnabled,
      courseBannerFadeColor,
      courseBannerFadeOpacity,
      supportButtonColor,
      supportButtonImage,
      featured,
      category,
      termsContent,
      termsFileUrl,
    } = body;

    if (supportEmail !== undefined && supportEmail !== null && supportEmail !== "") {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(supportEmail).trim());
      if (!emailOk) {
        return NextResponse.json(
          { error: "Email de suporte inválido" },
          { status: 400 }
        );
      }
    }

    // F2 — Support button customization. Color must be #rrggbb or
    // null/empty; image is a free-form URL up to 500 chars.
    if (
      supportButtonColor !== undefined &&
      supportButtonColor !== null &&
      supportButtonColor !== ""
    ) {
      if (!/^#[0-9a-fA-F]{6}$/.test(String(supportButtonColor))) {
        return NextResponse.json(
          { error: "Cor do botão de suporte inválida" },
          { status: 400 }
        );
      }
    }
    if (
      supportButtonImage !== undefined &&
      supportButtonImage !== null &&
      typeof supportButtonImage === "string" &&
      supportButtonImage.length > 500
    ) {
      return NextResponse.json(
        { error: "URL da imagem do botão muito longa" },
        { status: 400 }
      );
    }

    if (slug) {
      const existing = await prisma.course.findFirst({
        where: { slug, NOT: { id: params.id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Já existe um curso com esse slug" },
          { status: 409 }
        );
      }
    }

    const termsData: Record<string, unknown> = {};
    if (termsContent !== undefined || termsFileUrl !== undefined) {
      const newText = typeof termsContent === "string" ? termsContent.trim() || null : termsContent ?? undefined;
      const newFile = typeof termsFileUrl === "string" ? termsFileUrl.trim() || null : termsFileUrl ?? undefined;

      const current = await prisma.course.findUnique({
        where: { id: params.id },
        select: { termsContent: true, termsFileUrl: true },
      });

      if (newText !== undefined) termsData.termsContent = newText;
      if (newFile !== undefined) termsData.termsFileUrl = newFile;

      const finalText = newText !== undefined ? newText : current?.termsContent;
      const finalFile = newFile !== undefined ? newFile : current?.termsFileUrl;

      if (!finalText && !finalFile) {
        termsData.termsUpdatedAt = null;
      } else {
        const textChanged = newText !== undefined && current?.termsContent !== newText;
        const fileChanged = newFile !== undefined && current?.termsFileUrl !== newFile;
        if (textChanged || fileChanged) {
          termsData.termsUpdatedAt = new Date();
        }
      }
    }

    const course = await prisma.course.update({
      where: { id: params.id },
      data: {
        ...termsData,
        ...(title !== undefined && { title }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(thumbnail !== undefined && { thumbnail }),
        ...(thumbnailPosition !== undefined && { thumbnailPosition }),
        ...(bannerUrl !== undefined && { bannerUrl }),
        ...(bannerPosition !== undefined && { bannerPosition }),
        /* ⭐ 9.112 — a GUARDA GÊMEA do recorte do GET. Ver o comentário lá.

           Sem ela, o fix seria PIOR que o problema: o colaborador deixa de
           RECEBER preço e checkout, o `CourseForm` inicializa os campos vazios
           (`course.checkoutUrl || ""`), e o primeiro "Salvar" na aba Informações
           manda `checkoutUrl: null` e `price: null` — que este `update` grava.
           Perda silenciosa de dado em campo de receita.

           ⚠️ E o espelho, que o item não pedia mas a investigação achou: o
           colaborador com MANAGE_LESSONS JÁ PODIA alterar preço e checkout
           (`canEditCourse` o autoriza). Esconder um valor que se continua
           deixando sobrescrever seria pior que não esconder. O recorte é de
           leitura E de escrita, no mesmo commit.

           ⚠️ POR QUE IGNORAR EM SILÊNCIO E NÃO 403: o `CourseForm` envia
           SEMPRE o payload completo, inclusive estes campos. Um 403 recusaria
           o formulário inteiro e o colaborador não conseguiria salvar nem o
           título — a tela ficaria inutilizável para quem tem todo o direito de
           usá-la. Ignorar preserva a tela e fecha a escrita. Não é omissão: a
           decisão está escrita aqui e o campo nem chega ao formulário dele.

           ⓘ `externalProductId` não aparece nesta guarda porque o PUT NUNCA o
           escreveu — não está na desestruturação do corpo. Ele é gravado só
           pelas rotas de integração, todas `requireWorkspaceOwner`. */
        ...(check.isOwner && checkoutUrl !== undefined && { checkoutUrl }),
        ...(check.isOwner &&
          price !== undefined && {
            price:
              price === null || price === ""
                ? null
                : typeof price === "number"
                  ? price
                  : Number(price) || null,
          }),
        ...(check.isOwner &&
          priceCurrency !== undefined && {
            priceCurrency: priceCurrency || "BRL",
          }),
        ...(isPublished !== undefined && { isPublished: Boolean(isPublished) }),
        ...(showInStore !== undefined && { showInStore: Boolean(showInStore) }),
        ...(certificateEnabled !== undefined && {
          certificateEnabled: Boolean(certificateEnabled),
        }),
        ...(communityEnabled !== undefined && {
          communityEnabled: Boolean(communityEnabled),
        }),
        ...(lessonCommentsEnabled !== undefined && {
          lessonCommentsEnabled: Boolean(lessonCommentsEnabled),
        }),
        ...(lessonReactionsEnabled !== undefined && {
          lessonReactionsEnabled: Boolean(lessonReactionsEnabled),
        }),
        ...(reviewsEnabled !== undefined && {
          reviewsEnabled: Boolean(reviewsEnabled),
        }),
        ...(gamificationEnabled !== undefined && {
          gamificationEnabled: Boolean(gamificationEnabled),
        }),
        ...(lessonCommentsModerationEnabled !== undefined && {
          lessonCommentsModerationEnabled: Boolean(lessonCommentsModerationEnabled),
        }),
        ...(communityModerationEnabled !== undefined && {
          communityModerationEnabled: Boolean(communityModerationEnabled),
        }),
        ...(showStudentCount !== undefined && {
          showStudentCount: Boolean(showStudentCount),
        }),
        ...(supportEmail !== undefined && {
          supportEmail:
            typeof supportEmail === "string" && supportEmail.trim()
              ? supportEmail.trim()
              : null,
        }),
        ...(supportWhatsapp !== undefined && {
          supportWhatsapp:
            typeof supportWhatsapp === "string" && supportWhatsapp.replace(/\D/g, "")
              ? supportWhatsapp.replace(/\D/g, "")
              : null,
        }),
        ...(showLessonSupport !== undefined && {
          showLessonSupport: Boolean(showLessonSupport),
        }),
        ...(showCourseInfoBox !== undefined && {
          showCourseInfoBox: Boolean(showCourseInfoBox),
        }),
        ...(showAccessBadge !== undefined && {
          showAccessBadge: Boolean(showAccessBadge),
        }),
        ...(courseBannerFadeEnabled !== undefined && {
          courseBannerFadeEnabled: Boolean(courseBannerFadeEnabled),
        }),
        ...(courseBannerFadeColor !== undefined && {
          courseBannerFadeColor:
            courseBannerFadeColor &&
            /^#[0-9a-fA-F]{6}$/.test(courseBannerFadeColor)
              ? courseBannerFadeColor
              : null,
        }),
        ...(courseBannerFadeOpacity !== undefined && {
          courseBannerFadeOpacity:
            typeof courseBannerFadeOpacity === "number"
              ? courseBannerFadeOpacity
              : null,
        }),
        ...(supportButtonColor !== undefined && {
          supportButtonColor:
            typeof supportButtonColor === "string" &&
            supportButtonColor.trim()
              ? supportButtonColor.trim()
              : null,
        }),
        ...(supportButtonImage !== undefined && {
          supportButtonImage:
            typeof supportButtonImage === "string" &&
            supportButtonImage.trim()
              ? supportButtonImage.trim()
              : null,
        }),
        ...(category !== undefined && {
          category: typeof category === "string" && category.trim() ? category.trim() : null,
        }),
        ...(featured !== undefined && { featured: Boolean(featured) }),
      },
    });

    if (featured && course.featured) {
      await prisma.course.updateMany({
        where: { workspaceId: course.workspaceId, id: { not: course.id }, featured: true },
        data: { featured: false },
      });
    }

    return NextResponse.json({ course });
  } catch (error) {
    console.error("PUT /api/courses/[id] error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    if (staff.role === "COLLABORATOR") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    const check = await assertCanEditCourse(params.id);
    if ("error" in check) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    await prisma.course.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/courses/[id] error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
