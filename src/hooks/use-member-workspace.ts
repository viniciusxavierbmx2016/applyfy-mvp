"use client";

import { useEffect, useState } from "react";

interface MemberWorkspace {
  slug: string;
  name: string;
}

/**
 * O workspace que o usuário pode abrir como MEMBRO pelo vínculo de colaborador
 * (com ACCESS_MEMBER_AREA). Serve só para acender o link "Ver vitrine" de quem
 * não é dono de workspace nenhum.
 *
 * ⚠️ Separado de `useActiveWorkspace` de propósito: aquele responde "meu
 * workspace ativo no PAINEL" e é lido pelas telas de credencial de pagamento.
 * Misturar os dois faria a tela da Kiwify apontar para o workspace de outra
 * pessoa. Duas perguntas, dois hooks.
 */
export function useMemberWorkspace(): MemberWorkspace | null {
  const [workspace, setWorkspace] = useState<MemberWorkspace | null>(null);

  useEffect(() => {
    fetch("/api/me/member-workspace")
      .then((r) => (r.ok ? r.json() : { workspace: null }))
      .then((d) => {
        if (d?.workspace?.slug) setWorkspace(d.workspace);
      })
      .catch(() => {});
  }, []);

  return workspace;
}
