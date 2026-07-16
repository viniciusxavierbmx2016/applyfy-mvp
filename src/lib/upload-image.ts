// Uploader compartilhado das imagens de curso (thumbnail · banner · capa do módulo).
// Centraliza o fix do 7.14: os dois fronts tinham handleFileChange byte-idêntico com
// dois defeitos — sem guarda de tamanho no client (a janela ~4.5–5MB batia no 413 da
// lambda Vercel), e `res.json()` ANTES do `res.ok` (o 413 não-JSON quebrava o parse e o
// catch sobrescrevia com "Erro ao fazer upload", mascarando o motivo).
//
// ⚠️ 4 MB é a VERDADE do pipeline atual (a lambda /api/upload recebe o arquivo no body;
// a Vercel corta o body em ~4.5MB). A guarda client falha ANTES da rede, com mensagem
// honesta. O fix estrutural que remove o teto (upload direto browser→Supabase via signed
// URL, molde do BUG A) é a Fase B — quando entrar, sobe este limite.
export const MAX_IMAGE_MB = 4;
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;

/**
 * Sobe uma imagem por POST /api/upload. Retorna a URL pública, ou LANÇA um Error com
 * mensagem já-honesta pronta pra tela (tamanho · formato · rede/servidor).
 */
export async function uploadImage(file: File, path?: string): Promise<string> {
  // Guarda no client: mata a janela 4–5MB antes de bater no 413 da plataforma.
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new Error(
      `A imagem tem ${mb} MB — o máximo é ${MAX_IMAGE_MB} MB. Reduza o tamanho e tente de novo.`
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  if (path) formData.append("path", path);

  const res = await fetch("/api/upload", { method: "POST", body: formData });

  if (!res.ok) {
    // Erro da ROTA vem em JSON {error}; o 413 da PLATAFORMA vem NÃO-JSON — não deixar
    // o json() quebrar e mascarar o motivo. Lê defensivo e cai numa mensagem honesta.
    let msg = "";
    try {
      msg = (await res.json())?.error ?? "";
    } catch {
      /* corpo não-JSON (ex.: 413 da plataforma) */
    }
    if (!msg) {
      msg =
        res.status === 413
          ? `A imagem é grande demais para o servidor. Use uma imagem de até ${MAX_IMAGE_MB} MB.`
          : `Falha no upload (erro ${res.status}). Tente novamente.`;
    }
    throw new Error(msg);
  }

  const data = await res.json();
  return data.url as string;
}
