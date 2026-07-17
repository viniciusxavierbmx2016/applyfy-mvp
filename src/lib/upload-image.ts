import { createClient } from "@/lib/supabase";

// Uploader compartilhado das imagens (thumbnail · banner do curso · capa do
// módulo · banner da vitrine). Fase B do 7.14: o arquivo NÃO passa mais pela
// lambda /api/upload (teto ~4.5MB da Vercel) — o browser pede uma signed URL
// à emissora e sobe DIRETO pro Supabase Storage (molde do BUG A/materials).
// O contrato é o mesmo da Fase A: retorna a URL pública ou LANÇA um Error com
// mensagem já-honesta pronta pra tela (tamanho · formato · rede/servidor).
//
// 10MB = decisão de produto (2026-07-16), único pras 4 superfícies. O
// enforcement do tamanho REAL é o fileSizeLimit do bucket; esta guarda client
// falha ANTES da rede, com o tamanho verdadeiro na mensagem.
export const MAX_IMAGE_MB = 10;
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;

// Espelho client-safe do STORAGE_BUCKET de supabase-admin.ts (molde do
// MATERIALS_BUCKET_NAME): importável aqui sem puxar o service-role.
export const IMAGES_BUCKET_NAME = "thumbnails";

/**
 * Sobe uma imagem direto browser→Supabase (signed URL). Retorna a URL pública,
 * ou LANÇA um Error com mensagem já-honesta pronta pra tela.
 */
export async function uploadImage(file: File, path?: string): Promise<string> {
  // Guarda no client: falha antes da rede, com o MB real.
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new Error(
      `A imagem tem ${mb} MB — o máximo é ${MAX_IMAGE_MB} MB. Reduza o tamanho e tente de novo.`
    );
  }

  // 1. Pede a signed URL (corpo JSON minúsculo — nunca encosta no teto da Vercel).
  const signRes = await fetch("/api/upload/signed-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      path,
    }),
  });

  if (!signRes.ok) {
    // Erro da emissora vem em JSON {error}; leitura defensiva pra um corpo
    // não-JSON não mascarar o motivo (a lição da Fase A).
    let msg = "";
    try {
      msg = (await signRes.json())?.error ?? "";
    } catch {
      /* corpo não-JSON */
    }
    throw new Error(
      msg || `Falha no upload (erro ${signRes.status}). Tente novamente.`
    );
  }

  const { path: storagePath, token, publicUrl } = (await signRes.json()) as {
    path: string;
    token: string;
    publicUrl: string;
  };

  // 2. Upload DIRETO pro Supabase Storage (bypassa a Vercel → sem teto de lambda).
  const supabase = createClient();
  const { error: upErr } = await supabase.storage
    .from(IMAGES_BUCKET_NAME)
    .uploadToSignedUrl(storagePath, token, file);
  if (upErr) {
    throw new Error(
      "Falha no envio da imagem. Verifique sua conexão e tente de novo."
    );
  }

  return publicUrl;
}
