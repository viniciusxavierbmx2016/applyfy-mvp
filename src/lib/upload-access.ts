import { hasStaffPanelAccess } from "@/lib/staff-access";

/* Quem pode subir imagem de workspace/curso (bucket `thumbnails`).

   As duas portas — `/api/upload` e `/api/upload/signed-url` — declaram
   PARIDADE de gate no próprio comentário. Paridade declarada em comentário e
   mantida por cópia é a receita do 9.42/9.54/9.57: aqui é UMA função, e as
   duas a importam.

   ─── 9.88: o que muda ───
   O gate era `role !== "ADMIN" && role !== "PRODUCER"` — predicado por ROLE
   GLOBAL, portanto **cego ao colaborador híbrido**: desde o C5 o colaborador
   mantém `role=STUDENT`, então quem tem `MANAGE_LESSONS` (justamente quem edita
   aula e capa) levava 403 ao subir uma thumbnail.

   ⚠️ E o que NÃO muda: isto continua exigindo **vínculo + permissão**, nunca
   "não é aluno". O achado A2 da auditoria E2.1 era exatamente uma porta aberta
   a qualquer autenticado; uma conta recém-criada, sem workspace, sem curso e
   sem colaboração, continua recebendo 403 aqui.

   ⚠️ Estas rotas NÃO recebem contexto de curso — sobem imagem genérica (capa de
   workspace, de curso, de live). Então o vínculo verificável é "colabora em
   ALGUM lugar com MANAGE_LESSONS", como no 9.87. Exigir "MANAGE_LESSONS NESTE
   curso" pediria um parâmetro que os 4 call-sites não têm.

   ─── 9.109: a extração ───
   A decisão de fundo ("esta pessoa entra no painel?") virou
   `hasStaffPanelAccess`, compartilhada com o gate de 2FA. Aqui sobra só a
   PARTE ESPECÍFICA: qual permissão o vínculo precisa ter. ⚠️ O comportamento é
   byte-a-byte o de antes — mesma ordem de curto-circuito, mesma permissão. */

// A permissão de quem cuida de CONTEÚDO — é ela que precisa de capa e thumbnail.
const UPLOAD_PERMISSION = "MANAGE_LESSONS";

export async function canUploadWorkspaceAsset(user: {
  id: string;
  role: string;
}): Promise<boolean> {
  return hasStaffPanelAccess(user, { requirePermission: UPLOAD_PERMISSION });
}
