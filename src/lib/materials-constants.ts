// Allow-list + teto de tamanho dos materiais de aula, importado pela rota de
// upload (server) E pelo componente LessonMaterials (client) — fonte única,
// não divergem. (O bucket "materials" aceita qualquer MIME; esta é a única
// barreira de tipo/tamanho.)
export const MATERIALS_ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "audio/mpeg",
  "video/mp4",
  "text/plain",
  "text/csv",
]);

export const MATERIALS_MAX_SIZE = 50 * 1024 * 1024; // 50MB

// Bucket público onde os materiais vivem (mesmo valor de MATERIALS_BUCKET em
// supabase-admin.ts, mas exportado daqui pra ser importável pelo componente
// client sem puxar o service-role).
export const MATERIALS_BUCKET_NAME = "materials";

// Normaliza o nome do arquivo pro storagePath. Movida de materials/route.ts
// porque a rota signed-url também monta o path (comportamento idêntico).
export function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_");
}
